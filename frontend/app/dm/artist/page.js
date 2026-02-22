"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";
import { useRouter } from "next/navigation";
import { BASE_URL, WS_CHAT_URL } from "@/lib/api";

/* JWT UTIL */
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
  } catch (e) {
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

function getRoomAvatar(room) {
  return `https://picsum.photos/seed/${room?.roomId || room?.hostName || "dm"}/100/100`;
}

/* ARTIST CHAT PAGE */
export default function ArtistChatRoomPage() {
  const router = useRouter();
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
  const prevMessagesLengthRef = useRef(0);

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
      .get(`${BASE_URL}/api/chat/DM/role`, { headers: authHeaders })
      .then((res) => setMyRole(res.data.role))
      .catch((err) => console.log("[ROLE ERROR]", err));
  }, [pureToken, authHeaders]);

  useEffect(() => {
    if (!pureToken || !myEmail) return;
    axios
      .post(
        `${BASE_URL}/api/chat/DM/userId`,
        { email: myEmail },
        { headers: authHeaders }
      )
      .then((res) => setMyUserId(res.data))
      .catch(() => setMyUserId(null));
  }, [pureToken, myEmail, authHeaders]);

  useEffect(() => {
    if (!pureToken) return;
    axios
      .get(`${BASE_URL}/api/chat/DM/nickname`, {
        headers: authHeaders,
      })
      .then((res) => setMyNickname(res.data.nickname || myEmail))
      .catch(() => setMyNickname(myEmail));
  }, [pureToken, myEmail, authHeaders]);

  const selectRoom = useCallback(
    async (room) => {
      setSelectedRoom(room);
      setMessages([]);
      prevMessagesLengthRef.current = 0;
      if (!pureToken) return;
      try {
        const res = await axios.get(
          `${BASE_URL}/api/chat/DM/artist/rooms/${room.roomId}/messages`,
          { headers: authHeaders }
        );
        setMessages(res.data);
      } catch (e) {
        console.log("[LOAD MSG ERROR]", e);
      }
    },
    [pureToken, authHeaders]
  );

  useEffect(() => {
    if (!pureToken) return;
    axios
      .get(`${BASE_URL}/api/chat/DM/rooms`, {
        headers: authHeaders,
      })
      .then((res) => {
        setRooms(res.data);
        if (res.data.length > 0) {
          selectRoom(res.data[0]);
        }
      })
      .catch((err) => console.log("[ROOM LIST ERROR]", err));
  }, [pureToken, authHeaders, selectRoom]);

  useEffect(() => {
    if (!selectedRoom || !pureToken || myRole !== "ARTIST") return;
    if (clientRef.current) clientRef.current.deactivate();

    const socket = new SockJS(WS_CHAT_URL);
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: authHeaders,
      reconnectDelay: 3000,
      onConnect: () => {
        const topic = `/sub/chat/artist/${selectedRoom.roomId}`;
        client.subscribe(topic, (msg) => {
          const body = JSON.parse(msg.body);
          if (body.type === "FAN") return;
          setMessages((prev) => [...prev, body]);
        });
      },
    });

    client.activate();
    clientRef.current = client;
    return () => {
      if (clientRef.current) clientRef.current.deactivate();
    };
  }, [selectedRoom, pureToken, myRole, authHeaders]);

  const sendMessage = () => {
    if (!clientRef.current?.connected) return;
    if (!input.trim()) return;
    const displayName = myNickname || myEmail;
    const newMessage = {
      roomId: selectedRoom.roomId,
      senderId: myUserId,
      senderNickName: displayName,
      content: input,
    };

    setMessages((prev) => [
      ...prev,
      { ...newMessage, messageId: Date.now() },
    ]);
    clientRef.current.publish({
      destination: "/pub/chat/send/artist",
      body: JSON.stringify(newMessage),
    });
    setInput("");
  };

  useEffect(() => {
    if (messages.length === 0) return;

    const isInitialLoad = prevMessagesLengthRef.current === 0;
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (isInitialLoad || isNewMessage) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: isInitialLoad ? "auto" : "smooth",
        });
      });
    }
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden">
      {selectedRoom ? (
        <>
          <header className="h-16 shrink-0 border-b border-white/[0.06] bg-[#16102a]/80 backdrop-blur-sm z-10">
            <div className="mx-auto flex h-full max-w-4xl items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <Link
                  href="/home"
                  className="mr-2 p-1 text-white/55 transition-colors hover:text-white lg:hidden"
                  aria-label="뒤로"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div className="relative">
                  <img
                    src={getRoomAvatar(selectedRoom)}
                    className="size-10 rounded-full border border-white/[0.08]"
                    alt=""
                  />
                  <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-[#16102a] bg-green-500" />
                </div>
                <div>
                  <h3 className="font-bold leading-none text-white">
                    {selectedRoom.hostName}
                  </h3>
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-white/55">
                    Fan
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="mx-auto max-w-4xl space-y-6 p-6">
              <div className="mb-10 flex justify-center">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/55">
                  DM Session Started
                </span>
              </div>
              {messages.map((msg, index) => {
                if (Array.isArray(msg)) {
                  return (
                    <div
                      key={`fan-group-${index}`}
                      className="flex justify-start"
                    >
                      <button
                        onClick={() =>
                          router.push(
                            `/dm/artist/${selectedRoom.roomId}/fanmessage?group=${index}`
                          )
                        }
                        className="rounded-2xl border border-white/[0.06] bg-[#201a33] px-4 py-3 text-left text-white/90 transition-colors hover:bg-white/[0.06]"
                      >
                        <div className="mb-1 text-xs font-bold">
                          💌 팬 메시지 {msg.length}개
                        </div>
                      </button>
                    </div>
                  );
                }

                const isMine = Number(msg.senderId) === Number(myUserId);
                return (
                  <div
                    key={msg.messageId || index}
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[75%] gap-3 ${
                        isMine ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {!isMine && (
                        <img
                          src={getRoomAvatar(selectedRoom)}
                          className="mb-1 mt-auto size-8 shrink-0 rounded-full border border-white/[0.08]"
                          alt=""
                        />
                      )}
                      <div
                        className={`flex flex-col ${
                          isMine ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`rounded-2xl p-4 ${
                            isMine
                              ? "rounded-br-none bg-violet-600/90 text-white"
                              : "rounded-bl-none border border-white/[0.06] bg-[#201a33] text-white/90"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">
                            {msg.content}
                          </p>
                        </div>
                        <span className="mt-1 px-1 text-[10px] font-bold uppercase text-white/55">
                          {formatMessageTime(msg.createdAt) || "방금 전"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="mt-6 flex justify-start">
                <Link
                  href={`/dm/artist/livechat?roomId=${selectedRoom.roomId}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/15 px-5 py-3 text-sm font-bold text-violet-300 transition-colors hover:bg-violet-500/25"
                >
                  <span className="material-symbols-outlined text-lg">sensors</span>
                  ✨ 실시간 팬 메시지 보기 ✨
                </Link>
              </div>
              <div ref={messagesEndRef} />
            </div>
          </div>

          <footer className="shrink-0 border-t border-white/[0.06] bg-[#16102a]/80 backdrop-blur-sm">
            <div className="mx-auto flex max-w-4xl items-center gap-3 p-6">
              <button
                type="button"
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.06] text-white/55 transition-all hover:bg-white/[0.1]"
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
                className="flex-1 rounded-2xl border border-white/[0.06] bg-[#201a33] px-6 py-3.5 text-sm font-medium text-white outline-none transition-all placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#6d28d9] text-white transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_12px_rgba(140,90,255,0.25)] active:brightness-95"
                aria-label="보내기"
              >
                <span className="material-symbols-outlined fill-icon">send</span>
              </button>
            </div>
          </footer>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-[#16102a]/80">
          <p className="text-sm text-white/55">
            {rooms.length === 0 ? "DM 방이 없습니다." : "로딩 중..."}
          </p>
        </div>
      )}
    </div>
  );
}
