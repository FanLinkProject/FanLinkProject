"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { apiGet, apiPatch, apiPost, getToken, normalizeToken, WS_CHAT_URL } from "@/lib/api";

const SEND_DEST = "/pub/live/send";
const SUB_PREFIX = "/sub/live/";

function parseJwtPayload(tokenRaw) {
  if (tokenRaw == null || typeof tokenRaw !== "string") return null;
  const t = tokenRaw.trim().replace(/^Bearer\s+/i, "").trim();
  const parts = t.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isNumericId(id) {
  if (id == null) return false;
  const n = Number(id);
  return Number.isFinite(n) && String(n) === String(id);
}

export default function ArtistLiveProgressPage({ params }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams?.id;
  const router = useRouter();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [wsStatus, setWsStatus] = useState("Disconnected");
  const [endLoading, setEndLoading] = useState(false);
  const [endError, setEndError] = useState("");
  const [myUserId, setMyUserId] = useState(null);
  const [myNickname, setMyNickname] = useState("");
  const chatEndRef = useRef(null);
  const stompRef = useRef(null);

  const numericId = isNumericId(id) ? Number(id) : null;

  const connectStomp = useCallback((roomId, tokenRaw) => {
    if (stompRef.current) {
      try {
        stompRef.current.deactivate();
      } catch {}
      stompRef.current = null;
    }
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_CHAT_URL),
      connectHeaders: { Authorization: `Bearer ${tokenRaw}` },
      reconnectDelay: 2000,
      onConnect: () => {
        setWsStatus("Connected");
        const subDest = `${SUB_PREFIX}${roomId}`;
        client.subscribe(subDest, (frame) => {
          try {
            const parsed = JSON.parse(frame.body);
            setChat((prev) => [...prev, parsed]);
          } catch {
            setChat((prev) => [
              ...prev,
              { content: frame.body, nickname: "SYSTEM", sentAt: new Date().toISOString() },
            ]);
          }
        });
      },
      onWebSocketError: () => setWsStatus("Disconnected"),
      onStompError: () => setWsStatus("Disconnected"),
      onDisconnect: () => setWsStatus("Disconnected"),
    });
    stompRef.current = client;
    client.activate();
  }, []);

  const isMine = useCallback(
    (msg) => {
      if (msg.senderId != null) return String(msg.senderId) === String(myUserId);
      if (myNickname && msg.nickname) return msg.nickname === myNickname;
      return false;
    },
    [myUserId, myNickname]
  );

  useEffect(() => {
    if (numericId == null) {
      setLoading(false);
      setFetchError("잘못된 라이브 ID입니다.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError("");

    const token = getToken();
    if (!token) {
      setFetchError("로그인이 필요합니다.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await apiGet(`/api/live-sessions/${numericId}`);
        if (cancelled) return;
        setSession({
          id: data.id,
          title: data.title ?? "라이브",
          status: data.status ?? "LIVE",
          startedAt: data.startedAt,
        });
        setFetchError("");

        const pure = normalizeToken(token).replace(/^Bearer\s+/i, "");
        const payload = parseJwtPayload(pure);
        const email = payload?.sub ?? payload?.email ?? payload?.username;
        if (email) {
          try {
            const userIdRes = await apiPost("/api/chat/DM/userId", { email });
            const uid =
              typeof userIdRes === "number"
                ? userIdRes
                : userIdRes?.userId ?? userIdRes;
            if (!cancelled && uid != null) setMyUserId(String(uid));
          } catch (_) {}
          try {
            const profile = await apiGet("/api/user/profile");
            if (!cancelled && profile?.nickname) setMyNickname(profile.nickname);
          } catch (_) {}
        }

        if (data.status === "LIVE") {
          connectStomp(numericId, pure);
        }
      } catch (e) {
        if (!cancelled) {
          setFetchError(e?.message ?? "라이브 정보를 불러올 수 없습니다.");
          setSession(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        stompRef.current?.deactivate();
      } catch {}
      stompRef.current = null;
    };
  }, [numericId, connectStomp]);

  useEffect(() => {
    return () => {
      try {
        stompRef.current?.deactivate();
      } catch {}
      stompRef.current = null;
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const handleSend = () => {
    if (!message.trim()) return;
    const roomId = numericId;
    const c = stompRef.current;
    if (roomId != null && c && wsStatus === "Connected") {
      try {
        c.publish({
          destination: SEND_DEST,
          headers: { roomId: String(roomId) },
          body: JSON.stringify({ roomId, content: message.trim() }),
        });
        setMessage("");
      } catch (e) {
        console.error(e);
      }
    } else {
      setMessage("");
    }
  };

  const handleEndLive = async () => {
    if (numericId == null || endLoading) return;
    setEndError("");
    setEndLoading(true);
    try {
      await apiPatch(`/api/live-sessions/${numericId}/end`);
      try {
        stompRef.current?.deactivate();
      } catch {}
      stompRef.current = null;
      setWsStatus("Disconnected");
      router.push("/artist-console/live");
      return;
    } catch (e) {
      setEndError(e?.message ?? "라이브 종료에 실패했습니다.");
    } finally {
      setEndLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-white/55">로딩 중...</p>
      </div>
    );
  }

  if (fetchError && !session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black p-6">
        <p className="text-center text-red-300">{fetchError}</p>
        <Link href="/artist-console/live" className="text-sm text-white/70 hover:text-white">
          라이브 목록으로
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <p className="text-white/55">로딩 중...</p>
      </div>
    );
  }

  const isLive = session.status === "LIVE";
  const chatMessages = chat.map((msg) => ({
    ...msg,
    user: msg.nickname ?? msg.senderNickName ?? "?",
    text: msg.content ?? msg.body ?? "",
    tier: msg.tier ?? "일반",
  }));

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-black">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TODO: IVS 실제 스트림 송출 제어 연동 필요 */}
        {/* 현재는 LiveSession 상태 관리만 구현됨 */}
        {/* 실제 방송 송출은 OBS + IVS RTMP 설정 필요 */}
        <section className="group relative w-full shrink-0 aspect-video bg-black flex items-center justify-center">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <span className="material-symbols-outlined text-5xl text-white/30">videocam_off</span>
            <p className="text-sm text-amber-200/90 font-medium">
              ⚠ 현재 영상 송출 기능은 연동 예정입니다.
            </p>
            <p className="text-xs text-white/60">
              실제 스트리밍은 IVS RTMP 설정이 필요합니다.
            </p>
          </div>

          <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
            <Link
              href="/artist-console/live"
              className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
              aria-label="뒤로"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </Link>
            {isLive && (
              <>
                <span className="rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  LIVE
                </span>
                {wsStatus && (
                  <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white/90">
                    {wsStatus === "Connected" ? "채팅 연결됨" : wsStatus}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
            {endError && (
              <p className="text-[11px] text-red-300 bg-black/50 px-2 py-1 rounded">{endError}</p>
            )}
            <button
              type="button"
              onClick={handleEndLive}
              disabled={!isLive || endLoading}
              className="rounded-lg bg-red-600/90 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {endLoading ? "종료 중..." : "라이브 종료"}
            </button>
          </div>
        </section>

        <div className="flex shrink-0 items-center gap-3 bg-black/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white tracking-tight truncate">{session.title}</h2>
            <p className="truncate text-sm text-white/70 mt-0.5">아티스트 라이브 진행 중</p>
          </div>
        </div>
      </div>

      <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/5 bg-black/40 md:bg-black/30">
        <div className="flex h-11 shrink-0 items-center border-b border-white/5 px-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
            라이브 채팅
          </span>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar">
          {chatMessages.map((msg, i) => {
            const mine = isMine(msg);
            return (
              <div
                key={i}
                className={`flex gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/3 ${mine ? "justify-end text-right" : ""}`}
              >
                {!mine && (
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-white/50">
                    {msg.user?.[0] ?? "?"}
                  </div>
                )}
                <div className={`min-w-0 max-w-[70%] ${mine ? "order-first" : "flex-1"}`}>
                  <div className={`flex flex-wrap items-center gap-1.5 ${mine ? "justify-end" : ""}`}>
                    <span className="text-[11px] font-semibold text-white/90">{msg.user}</span>
                    <span className="text-[8px] text-white/40">{msg.tier}</span>
                  </div>
                  <div
                    className={`inline-block text-[11px] leading-relaxed wrap-break-word px-3 py-2 ${
                      mine
                        ? "rounded-2xl bg-violet-500/80 text-white"
                        : "rounded-2xl bg-white/10 text-gray-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
                {mine && (
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/80 text-[9px] font-semibold text-white">
                    {msg.user?.[0] ?? "나"}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="shrink-0 border-t border-white/5 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="채팅..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20"
            />
            <button
              type="button"
              onClick={handleSend}
              className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/15"
              aria-label="보내기"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
