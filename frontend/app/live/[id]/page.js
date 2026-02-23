"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import {
    apiGet,
    apiPatch,
    apiPost,
    getToken,
    normalizeToken,
    WS_CHAT_URL,
} from "@/lib/api";
import { createPlaybackToken } from "@/lib/ivsApi";
import IvsPlayer from "@/components/ivs/IvsPlayer";

import MembershipOnlyModal from "@/components/common/MembershipOnlyModal";
import { MOCK_ARTISTS } from "@/lib/mockData";

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

const MOCK_ARTIST = {
    id: "luna-ray",
    name: "루나 레이",
    avatar: "https://picsum.photos/seed/luna/200/200",
};

const MOCK_LIVES = {
    "live-now": {
        id: "live-now",
        artistId: "luna-ray",
        title: "Luna Ray Q&A",
        status: "LIVE",
        startTime: "LIVE NOW",
        thumbnail: "https://picsum.photos/seed/luna/800/450",
        viewerCount: "1.2만",
        timeLabel: "LIVE NOW",
    },
    "live-recorded": {
        id: "live-recorded",
        artistId: "luna-ray",
        title: "어쿠스틱 미니 라이브",
        status: "RECORDED",
        startTime: "2025.02.01 20:00",
        thumbnail: "https://picsum.photos/seed/luna/800/450",
        timeLabel: "다시보기",
    },
    "live-ended": {
        id: "live-ended",
        artistId: "luna-ray",
        title: "엔딩 세션",
        status: "ENDED",
        startTime: "2025.01.15",
        thumbnail: "https://picsum.photos/seed/luna/800/450",
        timeLabel: "종료",
    },
};

const INITIAL_COMMENTS = [
    {
        id: "c1",
        user: "팬A",
        avatar: "https://picsum.photos/seed/c1/100/100",
        text: "다시보기로라도 봤어요. 감사해요!",
        timestamp: "1일 전",
    },
    {
        id: "c2",
        user: "팬B",
        avatar: "https://picsum.photos/seed/c2/100/100",
        text: "이 곡 너무 좋아요 ㅠㅠ",
        timestamp: "2일 전",
    },
];

const SEND_DEST = "/pub/live/send";
const SUB_PREFIX = "/sub/live/";

function isNumericId(id) {
    if (id == null) return false;
    const n = Number(id);
    return Number.isFinite(n) && String(n) === String(id);
}

export default function LiveSessionPage({ params }) {
    const resolvedParams = React.use(params);
    const id = resolvedParams?.id;

    const [live, setLive] = useState(null);
    const [accessError, setAccessError] = useState("");
    const [loading, setLoading] = useState(true);

    const [chat, setChat] = useState([]);
    const [message, setMessage] = useState("");

    const [comments, setComments] = useState(INITIAL_COMMENTS);
    const [commentText, setCommentText] = useState("");

    const [isPlaying, setIsPlaying] = useState(true);
    const [wsStatus, setWsStatus] = useState("Disconnected");
    const [endLoading, setEndLoading] = useState(false);

    const [myUserId, setMyUserId] = useState(null);
    const [myNickname, setMyNickname] = useState("");

    const [showMembershipModal, setShowMembershipModal] = useState(false);
    const [subscriptionDeniedArtistId, setSubscriptionDeniedArtistId] =
        useState(null);
    const [subscriptionDeniedArtistName, setSubscriptionDeniedArtistName] =
        useState(null);

    const [ivsToken, setIvsToken] = useState(null);
    const [ivsError, setIvsError] = useState(null);

    const router = useRouter();
    const chatEndRef = useRef(null);
    const chatInputRef = useRef(null);
    const commentEndRef = useRef(null);
    const stompRef = useRef(null);

    /** 채팅 입력창: 내용에 따라 높이 확장, max 이상이면 스크롤 */
    const MAX_CHAT_INPUT_HEIGHT = 96; // max-h-24
    const adjustChatInputHeight = useCallback(() => {
        const el = chatInputRef.current;
        if (!el) return;
        el.style.height = "auto";
        const capped = Math.min(el.scrollHeight, MAX_CHAT_INPUT_HEIGHT);
        el.style.height = `${capped}px`;
        el.style.overflowY = el.scrollHeight > MAX_CHAT_INPUT_HEIGHT ? "auto" : "hidden";
    }, []);

    /** 403 시 모달 중복 오픈 방지 */
    const membershipModalShownRef = useRef(false);

    /** 라이브 종료 시 UI만 전환 (배너 표시, 채팅 비활성화). ref로 최신 setLive 참조. */
    const markLiveEndedRef = useRef(null);
    markLiveEndedRef.current = () => {
        setLive((prev) => (prev ? { ...prev, status: "ENDED" } : prev));
    };

    const numericId = isNumericId(id) ? Number(id) : null;
    const useApi = numericId != null;

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
                        if (
                            parsed &&
                            parsed.type === "SYSTEM" &&
                            parsed.event === "LIVE_ENDED"
                        ) {
                            markLiveEndedRef.current?.();
                            return;
                        }
                        setChat((prev) => [...prev, parsed]);
                    } catch {
                        setChat((prev) => [
                            ...prev,
                            {
                                content: frame.body,
                                nickname: "SYSTEM",
                                sentAt: new Date().toISOString(),
                            },
                        ]);
                    }
                });
            },
            onWebSocketError: () => setWsStatus("Disconnected"),
            onStompError: (frame) => {
                const body = frame?.body ?? "";
                if (
                    typeof body === "string" &&
                    (body.includes("LIVE_SESSION_NOT_LIVE") || body.includes("LIVE_ENDED"))
                ) {
                    markLiveEndedRef.current?.();
                }
                setWsStatus("Disconnected");
            },
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

    // ---- load live session (API or mock) ----
    useEffect(() => {
        if (!useApi) {
            const idStr = typeof id === "string" ? id : "live-now";
            setLive(MOCK_LIVES[idStr] || MOCK_LIVES["live-now"]);
            setLoading(false);
            return;
        }

        let cancelled = false;
        membershipModalShownRef.current = false;
        setLoading(true);
        setAccessError("");

        const token = getToken();
        if (!token) {
            setAccessError("로그인이 필요합니다.");
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const data = await apiGet(`/api/live-sessions/${numericId}/access`);
                if (cancelled) return;

                setLive({
                    id: data.id,
                    artistId: data.artistId,
                    artistNickname: data.artistNickname ?? null,
                    title: data.title ?? "라이브",
                    status: data.status ?? "LIVE",
                    startTime: data.startedAt
                        ? new Date(data.startedAt).toLocaleString("ko-KR")
                        : "LIVE NOW",
                    thumbnail: "https://picsum.photos/seed/live/800/450",
                    timeLabel: data.status === "LIVE" ? "LIVE NOW" : data.status,
                    viewerCount: data.viewerCount ?? null, // 있으면 표시 가능
                });

                setAccessError("");

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
                    setAccessError(e?.message ?? "접속 권한이 없거나 구독이 필요합니다.");
                    setLive(null);

                    const is403 =
                        e?.isForbidden ||
                        e?.code === 403 ||
                        (typeof e?.message === "string" &&
                            e.message.includes("LIVE_SESSION_SUBSCRIPTION_REQUIRED"));

                    if (is403 && !membershipModalShownRef.current) {
                        membershipModalShownRef.current = true;
                        setShowMembershipModal(true);

                        if (numericId != null) {
                            apiGet(`/api/live-sessions/${numericId}`)
                                .then((data) => {
                                    if (data?.artistId != null)
                                        setSubscriptionDeniedArtistId(data.artistId);
                                    if (data?.artistNickname != null)
                                        setSubscriptionDeniedArtistName(data.artistNickname);
                                })
                                .catch(() => {});
                        }
                    }
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
    }, [id, useApi, numericId, connectStomp]);

    // unmount safeguard
    useEffect(() => {
        return () => {
            try {
                stompRef.current?.deactivate();
            } catch {}
            stompRef.current = null;
        };
    }, []);

    // IVS Playback Token 발급 (LIVE일 때) + 만료 전 자동 갱신
    useEffect(() => {
        if (!numericId || !live || live.status !== "LIVE") return;

        setIvsError(null);
        setIvsToken(null);

        const fetchToken = () =>
            createPlaybackToken(numericId, 300)
                .then((res) => setIvsToken(res))
                .catch((e) =>
                    setIvsError(e?.data?.message || e.message || "IVS 토큰 발급 실패")
                );

        fetchToken();

        const refreshMs = 240 * 1000; // recommendedRefreshInSeconds 기본값
        const timer = setInterval(fetchToken, refreshMs);
        return () => clearInterval(timer);
    }, [numericId, live?.status]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    useEffect(() => {
        commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments]);

    useEffect(() => {
        adjustChatInputHeight();
    }, [message, adjustChatInputHeight]);

    const handleSend = () => {
        if (!message.trim()) return;
        if (showMembershipModal) return;
        if (!live || live.status !== "LIVE") {
            alert("라이브가 종료되어 채팅을 보낼 수 없습니다.");
            return;
        }

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
            return;
        }

        // mock fallback
        setChat((prev) => [...prev, { user: "나", text: message, tier: "서포터" }]);
        setMessage("");
    };

    const handleCommentSubmit = () => {
        if (!commentText.trim()) return;
        setComments((prev) => [
            ...prev,
            {
                id: `c-${Date.now()}`,
                user: "나",
                avatar: "https://picsum.photos/seed/me/100/100",
                text: commentText.trim(),
                timestamp: "방금 전",
            },
        ]);
        setCommentText("");
    };

    const handleEndLive = async () => {
        if (numericId == null || !live || live.status !== "LIVE") return;
        setEndLoading(true);
        try {
            await apiPatch(`/api/live-sessions/${numericId}/end`, {});
            setLive((prev) => (prev ? { ...prev, status: "ENDED" } : null));
            try {
                stompRef.current?.deactivate();
            } catch {}
            stompRef.current = null;
            setWsStatus("Disconnected");
        } catch (e) {
            setAccessError(e?.message ?? "종료 실패");
        } finally {
            setEndLoading(false);
        }
    };

    // ---- states for render ----
    if (loading && useApi) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <p className="text-white/55">로딩 중...</p>
            </div>
        );
    }

    if (useApi && accessError && !live) {
        if (showMembershipModal) {
            const resolvedSlug =
                subscriptionDeniedArtistId != null
                    ? (MOCK_ARTISTS.find((a) => a.backendId === subscriptionDeniedArtistId)
                        ?.id ?? String(subscriptionDeniedArtistId))
                    : null;

            return (
                <div className="fixed inset-0 flex items-center justify-center bg-black p-6">
                    <MembershipOnlyModal
                        isOpen={true}
                        onClose={() => {
                            membershipModalShownRef.current = false;
                            setShowMembershipModal(false);
                            setSubscriptionDeniedArtistId(null);
                            setSubscriptionDeniedArtistName(null);
                        }}
                        artistId={resolvedSlug}
                        artistName={subscriptionDeniedArtistName ?? undefined}
                        contentLabel="라이브"
                    />
                </div>
            );
        }

        return (
            <div className="flex h-screen flex-col items-center justify-center gap-6 bg-black p-6">
                <div className="rounded-2xl border border-white/10 bg-[#201a33] p-8 text-center max-w-md">
                    <h2 className="text-lg font-bold text-white mb-2">접근 불가</h2>
                    <p className="text-sm text-white/80 mb-6">{accessError}</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/"
                            className="px-6 py-3 rounded-xl border border-white/10 text-white/90 text-sm font-semibold hover:bg-white/5 transition-colors"
                        >
                            홈으로
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!live) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <p className="text-white/55">로딩 중...</p>
            </div>
        );
    }

    const isLive = live.status === "LIVE";
    const isRecorded = live.status === "RECORDED";
    const isEndedNoVod = live.status === "ENDED";

    const chatMessages =
        isLive && useApi
            ? chat.map((msg) => ({
                ...msg,
                user: msg.nickname ?? msg.senderNickName ?? "?",
                text: msg.content ?? msg.body ?? "",
                tier: msg.tier ?? "일반",
            }))
            : [];

    const defaultMockChat = [
        { user: "김팬", text: "기다렸어요!! 💜", tier: "골드", senderId: null },
        {
            user: "별하늘",
            text: "지난번 스트리밍도 너무 좋았는데 오늘도 기대돼요 ✨",
            tier: "멤버십",
            senderId: null,
        },
    ];

    const displayChat = isLive ? (useApi ? chatMessages : defaultMockChat) : [];

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-black">
            {numericId && isLive && (
                <div className="absolute top-2 left-2 right-2 z-10 flex justify-center">
                    <div className="bg-black/80 rounded-lg px-3 py-2 text-xs text-white/90">
                        {ivsToken?.playbackUrl && ivsToken?.token ? (
                            <span>라이브 재생 중 (만료: {ivsToken.expiresAt?.slice(0, 19)})</span>
                        ) : ivsToken ? (
                            <span>IVS 토큰 발급됨 — 재생 URL 대기 중</span>
                        ) : ivsError ? (
                            <span className="text-red-400">{ivsError}</span>
                        ) : (
                            <span>IVS 토큰 요청 중...</span>
                        )}
                    </div>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <section className="group relative w-full shrink-0 aspect-video bg-black">
                    {useApi && !isLive && (
                        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center bg-black/60 py-2">
                            <p className="text-xs font-semibold text-white">
                                라이브가 종료되었습니다.
                            </p>
                        </div>
                    )}

                    {isEndedNoVod ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-white/20 block mb-3">
                  video_off
                </span>
                                <p className="text-white/50 text-sm">
                                    다시보기가 준비되지 않았습니다.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {useApi && isLive && ivsToken?.playbackUrl && ivsToken?.token ? (
                                <IvsPlayer
                                    playbackUrl={ivsToken.playbackUrl}
                                    token={ivsToken.token}
                                    className="aspect-video w-full"
                                />
                            ) : (
                                <img
                                    src={live.thumbnail}
                                    className="h-full w-full object-contain bg-black"
                                    alt="Live stream"
                                />
                            )}

                            {isRecorded && (
                                <div
                                    className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40"
                                    onClick={() => setIsPlaying((p) => !p)}
                                >
                  <span className="material-symbols-outlined text-6xl text-white opacity-90">
                    {isPlaying ? "pause_circle" : "play_circle"}
                  </span>
                                </div>
                            )}

                            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                                <Link
                                    href="/"
                                    className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
                                    aria-label="뒤로"
                                >
                  <span className="material-symbols-outlined text-lg">
                    arrow_back
                  </span>
                                </Link>

                                {isLive && (
                                    <>
                    <span className="rounded bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      LIVE
                    </span>
                                        {!!live.viewerCount && (
                                            <span className="px-2 py-0.5 bg-black/40 text-white/90 text-[10px] font-medium rounded flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">
                          visibility
                        </span>
                                                {live.viewerCount}
                      </span>
                                        )}
                                        {wsStatus && (
                                            <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white/90">
                        {wsStatus === "Connected" ? "채팅 연결됨" : wsStatus}
                      </span>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                <button
                                    type="button"
                                    onClick={() => setIsPlaying((p) => !p)}
                                    className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                                    aria-label={isPlaying ? "일시정지" : "재생"}
                                >
                  <span className="material-symbols-outlined text-xl">
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                                        aria-label="볼륨"
                                    >
                    <span className="material-symbols-outlined text-xl">
                      volume_up
                    </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                                        aria-label="전체화면"
                                    >
                    <span className="material-symbols-outlined text-xl">
                      fullscreen
                    </span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                <div className="flex shrink-0 items-center gap-3 bg-black/60 px-4 py-3">
                    <img
                        src={MOCK_ARTIST.avatar}
                        className="size-9 rounded-full object-cover"
                        alt=""
                    />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-bold text-white tracking-tight truncate">
                            {live.title}
                        </h2>
                        {((useApi && live.artistNickname) || !useApi) && (
                            <p className="truncate text-sm font-semibold text-white/90 mt-0.5">
                                {useApi ? live.artistNickname : MOCK_ARTIST.name}
                            </p>
                        )}
                    </div>

                    {/* (선택) 아티스트가 본인일 때 종료 버튼 노출하고 싶으면 isMine/role로 조건 주면 됨 */}
                    <button
                        type="button"
                        className="shrink-0 rounded-lg bg-violet-600/80 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-600"
                        onClick={() => router.push(`/candy/payment?artistId=${live.artistId ?? ""}`)}
                    >
                        구독하기
                    </button>

                    {/* 필요하면 테스트용으로 종료 버튼 살려두기 */}
                    {/* {useApi && isLive && (
            <button
              type="button"
              onClick={handleEndLive}
              disabled={endLoading}
              className="shrink-0 rounded-lg bg-red-500/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {endLoading ? "종료 중..." : "종료"}
            </button>
          )} */}
                </div>
            </div>

            <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/5 bg-black/40 md:bg-black/30">
                {isLive ? (
                    <>
                        <div className="flex h-11 shrink-0 items-center border-b border-white/5 px-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                라이브 채팅
              </span>
                        </div>

                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar">
                            {displayChat.map((msg, i) => {
                                const mine = isMine(msg);
                                return (
                                    <div
                                        key={i}
                                        className={`flex gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03] ${
                                            mine ? "justify-end" : ""
                                        }`}
                                    >
                                        {!mine && (
                                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-semibold text-white/50">
                                                {msg.user?.[0] ?? "?"}
                                            </div>
                                        )}

                                        <div
                                            className={`min-w-0 max-w-[70%] ${
                                                mine ? "order-first flex flex-col items-end" : "flex-1"
                                            }`}
                                        >
                                            <div
                                                className={`flex flex-wrap items-center gap-1.5 ${
                                                    mine ? "justify-end" : ""
                                                }`}
                                            >
                        <span className="text-[11px] font-semibold text-white/90">
                          {msg.user}
                        </span>
                                                <span className="text-[8px] text-white/40">{msg.tier}</span>
                                            </div>

                                            <div
                                                className={`text-[11px] leading-relaxed break-words px-3 py-2 ${
                                                    mine
                                                        ? "rounded-2xl bg-violet-500/80 text-white text-left whitespace-pre-wrap max-w-full"
                                                        : "rounded-2xl bg-white/10 text-gray-100 inline-block"
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
                            <div className="flex gap-2 items-end">
                                <textarea
                                    ref={chatInputRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            if (!isLive) return;
                                            handleSend();
                                        }
                                    }}
                                    onInput={adjustChatInputHeight}
                                    placeholder={
                                        isLive
                                            ? "채팅... (Enter 전송, Shift+Enter 줄바꿈)"
                                            : "라이브가 종료되어 채팅을 보낼 수 없습니다."
                                    }
                                    disabled={!isLive}
                                    rows={1}
                                    className={`min-h-[36px] max-h-24 flex-1 resize-none overflow-y-hidden rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20 ${
                                        !isLive ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                    style={{ height: 36 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={!isLive}
                                    className={`flex size-8 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/15 ${
                                        !isLive
                                            ? "opacity-40 cursor-not-allowed hover:bg-white/10"
                                            : ""
                                    }`}
                                    aria-label="보내기"
                                >
                  <span className="material-symbols-outlined text-base">
                    send
                  </span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex h-11 shrink-0 items-center border-b border-white/5 px-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                댓글
              </span>
                            <span className="ml-2 text-[10px] text-white/45">
                {comments.length}개
              </span>
                        </div>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 custom-scrollbar">
                            {comments.map((c) => (
                                <div key={c.id} className="flex gap-3">
                                    <img
                                        src={c.avatar}
                                        alt=""
                                        className="size-8 shrink-0 rounded-full border border-white/10 object-cover"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-white/90">
                        {c.user}
                      </span>
                                            <span className="text-[9px] text-white/45">{c.timestamp}</span>
                                        </div>
                                        <p className="mt-0.5 text-[11px] leading-snug text-white/80 break-words">
                                            {c.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={commentEndRef} />
                        </div>

                        <div className="shrink-0 border-t border-white/5 p-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
                                    placeholder="댓글을 입력하세요..."
                                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20"
                                />
                                <button
                                    type="button"
                                    onClick={handleCommentSubmit}
                                    className="flex size-8 items-center justify-center rounded-lg bg-violet-500/80 text-white transition-colors hover:brightness-110"
                                    aria-label="댓글 작성"
                                >
                  <span className="material-symbols-outlined text-base">
                    send
                  </span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
}
