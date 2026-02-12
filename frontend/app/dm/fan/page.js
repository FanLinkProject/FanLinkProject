"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

function parseJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    return JSON.parse(
      decodeURIComponent(
        Array.prototype.map
          .call(atob(padded), (c) =>
            "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
          )
          .join("")
      )
    );
  } catch {
    return null;
  }
}

function getEmailFromTokenPayload(payload) {
  if (!payload) return "";
  return payload.email || payload.username || payload.sub || "";
}

function formatMessageTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return "방금 전";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "어제";
  return date.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
}

export default function FanChatRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get("roomId");
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [accessToken, setAccessToken] = useState("");
  const [myUserId, setMyUserId] = useState(null);
  const [myRole, setMyRole] = useState("");
  const [myNickname, setMyNickname] = useState("");

  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setAccessToken(token);
  }, [router]);

  const pureToken = useMemo(
    () => accessToken.trim().replace(/^Bearer\s+/i, ""),
    [accessToken]
  );

  const tokenPayload = useMemo(
    () => (pureToken ? parseJwtPayload(pureToken) : null),
    [pureToken]
  );

  const myEmail = useMemo(
    () => getEmailFromTokenPayload(tokenPayload),
    [tokenPayload]
  );

  const authHeaders = useMemo(
    () => (pureToken ? { Authorization: `Bearer ${pureToken}` } : {}),
    [pureToken]
  );

  useEffect(() => {
    if (!pureToken) return;
    axios
      .get("http://localhost:8080/api/chat/DM/role", {
        headers: authHeaders,
      })
      .then((res) => setMyRole(res.data.role))
      .catch((err) => console.log("[ROLE ERROR]", err));
  }, [pureToken, authHeaders]);

  useEffect(() => {
    if (!pureToken) return;
    axios
      .get("http://localhost:8080/api/chat/DM/nickname", {
        headers: authHeaders,
      })
      .then((res) => setMyNickname(res.data.nickname || myEmail))
      .catch(() => setMyNickname(myEmail));
  }, [pureToken, myEmail, authHeaders]);

  useEffect(() => {
    if (!pureToken || !myEmail) return;
    axios
      .post(
        "http://localhost:8080/api/chat/DM/userId",
        { email: myEmail },
        { headers: authHeaders }
      )
      .then((res) => setMyUserId(res.data))
      .catch(() => setMyUserId(null));
  }, [pureToken, myEmail, authHeaders]);

  const selectRoom = useCallback(
    async (room) => {
      if (!pureToken) return;
      setSelectedRoom(room);
      setMessages([]);
      try {
        const res = await axios.get(
          `http://localhost:8080/api/chat/DM/fan/rooms/${room.roomId}/messages`,
          { headers: authHeaders }
        );
        setMessages(res.data);
      } catch (e) {
        console.log("[LOAD FAN MESSAGES ERROR]", e);
      }
    },
    [pureToken, authHeaders]
  );

  useEffect(() => {
    if (!pureToken) return;
    axios
      .get("http://localhost:8080/api/chat/DM/rooms", {
        headers: authHeaders,
      })
      .then((res) => {
        setRooms(res.data);
        if (res.data.length > 0) {
          const target =
            roomIdFromUrl
              ? res.data.find((r) => String(r.roomId) === String(roomIdFromUrl))
              : null;
          selectRoom(target || res.data[0]);
        }
      })
      .catch((err) => console.log("[ROOM LIST ERROR]", err));
  }, [pureToken, authHeaders, selectRoom, roomIdFromUrl]);

  useEffect(() => {
    if (!selectedRoom) return;
    if (myRole !== "USER") return;

    if (clientRef.current) clientRef.current.deactivate();

    const socket = new SockJS("http://localhost:8080/ws-chat");
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: authHeaders,
      reconnectDelay: 5000,
      onConnect: () => {
        const subscribeUrl = `/sub/chat/fan/${selectedRoom.roomId}`;
        client.subscribe(subscribeUrl, (msg) => {
          const body = JSON.parse(msg.body);
          setMessages((prev) => [...prev, body]);
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => client.deactivate();
  }, [selectedRoom, myRole, pureToken, authHeaders]);

  const sendMessage = () => {
    if (!clientRef.current?.connected) return;
    if (!selectedRoom || input.trim() === "" || !myUserId) return;

    const displayName = myNickname || myEmail;
    const message = {
      roomId: selectedRoom.roomId,
      senderId: myUserId,
      senderNickName: displayName,
      content: input,
    };

    clientRef.current.publish({
      destination: "/pub/chat/send/fan",
      body: JSON.stringify(message),
    });

    setMessages((prev) => [...prev, { ...message, messageId: Date.now() }]);
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getRoomAvatar = (room) =>
    `https://picsum.photos/seed/${room.roomId || room.hostName}/100/100`;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <section className="flex-1 flex flex-col overflow-hidden">
        {selectedRoom ? (
          <>
            <header className="h-16 border-b border-white/[0.06] shrink-0 bg-[#16102a]/80 backdrop-blur-sm z-10">
              <div className="max-w-4xl mx-auto h-full px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link
                    href="/home"
                    className="p-1 mr-2 text-white/55 hover:text-white transition-colors lg:hidden"
                    aria-label="뒤로"
                  >
                    <span className="material-symbols-outlined">
                      arrow_back
                    </span>
                  </Link>
                  <div className="relative">
                    <img
                      src={getRoomAvatar(selectedRoom)}
                      className="size-10 rounded-full border border-white/[0.08]"
                      alt=""
                    />
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-[#16102a] rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-none">
                      {selectedRoom.hostName}
                    </h3>
                    <p className="text-[10px] text-white/55 font-bold uppercase tracking-widest mt-1.5">
                      {selectedRoom.groupName || "Official"}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="flex justify-center mb-10">
                  <span className="px-4 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full text-[10px] font-black text-white/55 uppercase tracking-widest">
                    DM Session Started
                  </span>
                </div>
                {messages.map((msg) => {
                  const isMe = Number(msg.senderId) === Number(myUserId);
                  return (
                    <div
                      key={msg.messageId || `${msg.createdAt}-${msg.senderId}`}
                      className={`flex ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[75%] ${
                          isMe ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {!isMe && (
                          <img
                            src={getRoomAvatar(selectedRoom)}
                            className="size-8 rounded-full mt-auto mb-1 shrink-0 border border-white/[0.08]"
                            alt=""
                          />
                        )}
                        <div
                          className={`flex flex-col ${
                            isMe ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`p-4 rounded-2xl ${
                              isMe
                                ? "bg-violet-600/90 text-white rounded-br-none"
                                : "bg-[#201a33] text-white/90 rounded-bl-none border border-white/[0.06]"
                            }`}
                          >
                            <p className="text-sm leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                          <span className="text-[10px] text-white/55 font-bold uppercase mt-1 px-1">
                            {formatMessageTime(msg.createdAt) || "방금 전"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <footer className="border-t border-white/[0.06] shrink-0 bg-[#16102a]/80 backdrop-blur-sm">
              <div className="max-w-4xl mx-auto p-6 flex items-center gap-3">
                <button
                  type="button"
                  className="size-12 rounded-2xl bg-white/[0.06] text-white/55 hover:bg-white/[0.1] transition-all flex items-center justify-center border border-white/[0.06]"
                  aria-label="첨부"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={`${selectedRoom.hostName}님에게 메시지 보내기...`}
                  className="flex-1 bg-[#201a33] border border-white/[0.06] rounded-2xl px-6 py-3.5 text-sm focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 transition-all outline-none font-medium text-white"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="size-12 bg-[#6d28d9] text-white rounded-2xl flex items-center justify-center hover:brightness-110 hover:shadow-[0_0_12px_rgba(140,90,255,0.25)] active:brightness-95 transition-all duration-200"
                  aria-label="보내기"
                >
                  <span className="material-symbols-outlined fill-icon">
                    send
                  </span>
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#16102a]/80">
            <p className="text-white/55 text-sm">DM 방이 없습니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
