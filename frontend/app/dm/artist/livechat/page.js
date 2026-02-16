"use client";

import React, { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useRouter, useSearchParams } from "next/navigation";

function parseJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    return JSON.parse(
      decodeURIComponent(
        Array.prototype.map
          .call(atob(padded), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
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

// useSearchParams를 사용하는 컴포넌트를 분리
const ChatDMDetailContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");

  const [tokenFromStorage, setTokenFromStorage] = useState("");
  const [messages, setMessages] = useState([]);
  const [myRole, setMyRole] = useState("");

  const clientRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setTokenFromStorage(token);
  }, [router]);

  const pureToken = useMemo(
    () => tokenFromStorage?.trim().replace(/^Bearer\s+/i, ""),
    [tokenFromStorage]
  );
  const tokenPayload = useMemo(() => (pureToken ? parseJwtPayload(pureToken) : null), [pureToken]);

  useEffect(() => {
    if (!tokenPayload) return;
    const role =
      tokenPayload?.role === "ROLE_ARTIST" || tokenPayload?.role === "ARTIST"
        ? "ARTIST"
        : "UNKNOWN";
    setMyRole(role);
  }, [tokenPayload]);

  useEffect(() => {
    if (!roomId || !pureToken || myRole !== "ARTIST") return;
    if (clientRef.current) clientRef.current.deactivate();

    const socket = new SockJS("http://localhost:8080/ws-chat");
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: { Authorization: `Bearer ${pureToken}` },
      reconnectDelay: 5000,
      debug: (str) => console.log("[STOMP]", str),
      onConnect: () => {
        const subscribeUrl = `/sub/chat/artist/${roomId}`;
        console.log("📌 ARTIST SUBSCRIBE FAN MESSAGES:", subscribeUrl);
        client.subscribe(subscribeUrl, (msg) => {
          const body = JSON.parse(msg.body);
          setMessages((prev) => [...prev, body]);
        });
      },
    });

    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [roomId, pureToken, myRole]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">
        ✨ 실시간 팬 메시지 보기 ✨
      </h2>

      <div className="rounded-2xl border border-white/[0.06] bg-[#201a33] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        <div ref={scrollRef} className="h-[400px] overflow-y-auto space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.messageId || `${msg.createdAt}-${msg.senderId}`}
              className="flex justify-start"
            >
              <div className="max-w-[70%] rounded-2xl rounded-bl-none border border-white/[0.06] bg-[#16102a] px-4 py-3 text-white/90">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/55 mb-1">
                  {msg.senderNickName ?? "Unknown"}
                </div>
                <div className="text-sm">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Suspense로 감싼 메인 컴포넌트
const ChatDMDetailPage = () => {
  return (
    <Suspense fallback={
      <div className="p-8 lg:p-12 max-w-5xl mx-auto">
        <div className="text-white">로딩 중...</div>
      </div>
    }>
      <ChatDMDetailContent />
    </Suspense>
  );
};

export default ChatDMDetailPage;
