"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createPlaybackToken } from "@/lib/ivsApi";

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

const INITIAL_CHAT = [
  { user: "김팬", text: "기다렸어요!! 💜", tier: "골드" },
  {
    user: "별하늘",
    text: "지난번 스트리밍도 너무 좋았는데 오늘도 기대돼요 ✨",
    tier: "멤버십",
  },
  { user: "MusicLover", text: "서울에서 응원합니다! 🗽", tier: "일반" },
];

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

export default function LiveSessionPage({ params }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams?.id;
  const searchParams = useSearchParams();
  const liveSessionIdParam = searchParams?.get("liveSessionId");

  const [live, setLive] = useState(null);
  const [chat, setChat] = useState(INITIAL_CHAT);
  const [message, setMessage] = useState("");
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [commentText, setCommentText] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [ivsToken, setIvsToken] = useState(null);
  const [ivsError, setIvsError] = useState(null);
  const chatEndRef = useRef(null);
  const commentEndRef = useRef(null);

  useEffect(() => {
    const idStr = typeof id === "string" ? id : "live-now";
    setLive(MOCK_LIVES[idStr] || MOCK_LIVES["live-now"]);
  }, [id]);

  // IVS Playback Token: URL에 liveSessionId가 있고 LIVE일 때 토큰 발급 (실제 연동 시 플레이어에 token 전달)
  useEffect(() => {
    const numId = liveSessionIdParam ? Number(liveSessionIdParam) : null;
    if (!numId || !live || live.status !== "LIVE") return;
    setIvsError(null);
    createPlaybackToken(numId, 300)
      .then((res) => setIvsToken(res))
      .catch((e) =>
        setIvsError(e?.data?.message || e.message || "IVS 토큰 발급 실패"),
      );
  }, [liveSessionIdParam, live?.status]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat]);

  useEffect(() => {
    if (commentEndRef.current) {
      commentEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const handleSend = () => {
    if (!message.trim()) return;
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

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-black">
      {liveSessionIdParam && isLive && (
        <div className="absolute top-2 left-2 right-2 z-10 flex justify-center">
          <div className="bg-black/80 rounded-lg px-3 py-2 text-xs text-white/90">
            {ivsToken ? (
              <span>
                IVS 토큰 발급됨 (만료: {ivsToken.expiresAt?.slice(0, 19)}) —
                플레이어에 token 전달 시 재생 가능
              </span>
            ) : ivsError ? (
              <span className="text-red-400">{ivsError}</span>
            ) : (
              <span>IVS 토큰 요청 중...</span>
            )}
          </div>
        </div>
      )}
      {/* 좌측: 영상 + 아티스트 바 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 1. 영상 영역 — 풀폭, 상단, 16:9, 장식 없음 */}
        <section className="relative w-full aspect-video bg-black shrink-0 group">
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
              <img
                src={live.thumbnail}
                className="w-full h-full object-contain bg-black"
                alt="Live stream"
              />
              {isRecorded && (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
                  onClick={() => setIsPlaying((p) => !p)}
                >
                  <span className="material-symbols-outlined text-white text-6xl opacity-90">
                    {isPlaying ? "pause_circle" : "play_circle"}
                  </span>
                </div>
              )}

              {/* 2. LIVE 정보 오버레이 — 좌측 상단, 최소 스타일 */}
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                <Link
                  href="/"
                  className="size-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                  aria-label="뒤로"
                >
                  <span className="material-symbols-outlined text-lg">
                    arrow_back
                  </span>
                </Link>
                {isLive && (
                  <>
                    <span className="px-2 py-0.5 bg-red-600/90 text-white text-[10px] font-bold uppercase rounded">
                      LIVE
                    </span>
                    {live.viewerCount && (
                      <span className="px-2 py-0.5 bg-black/40 text-white/90 text-[10px] font-medium rounded flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">
                          visibility
                        </span>
                        {live.viewerCount}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* 3. 플레이어 컨트롤 — 데스크톱 hover 시 노출, 모바일 항상 노출 */}
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="size-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label={isPlaying ? "일시정지" : "재생"}
                >
                  <span className="material-symbols-outlined text-xl">
                    {isPlaying ? "pause" : "play_arrow"}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="size-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                    aria-label="볼륨"
                  >
                    <span className="material-symbols-outlined text-xl">
                      volume_up
                    </span>
                  </button>
                  <button
                    type="button"
                    className="size-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
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

        {/* 4. 하단 아티스트 정보 바 — 높이 최소, 장식 없음 */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-black/60 shrink-0">
          <img
            src={MOCK_ARTIST.avatar}
            className="size-9 rounded-full object-cover"
            alt=""
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white truncate">
                {MOCK_ARTIST.name}
              </span>
              <span
                className="material-symbols-outlined text-white/70 text-sm fill-icon shrink-0"
                aria-hidden
              >
                verified
              </span>
            </div>
            <p className="text-[10px] text-white/50 font-medium">
              {isLive ? "LIVE NOW" : live.startTime}
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-1.5 bg-violet-600/80 text-white rounded-lg text-xs font-semibold hover:bg-violet-600 transition-colors shrink-0"
          >
            구독하기
          </button>
        </div>
      </div>

      {/* 5. 라이브일 때: 채팅 / 다시보기일 때: 댓글 */}
      <aside className="w-[320px] flex flex-col shrink-0 bg-black/40 border-l border-white/5 md:bg-black/30">
        {isLive ? (
          <>
            <div className="h-11 px-4 border-b border-white/5 flex items-center shrink-0">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                라이브 채팅
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 custom-scrollbar">
              {chat.map((msg, i) => (
                <div
                  key={i}
                  className="flex gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <div className="size-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-semibold text-white/50 shrink-0">
                    {msg.user[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-white/90">
                        {msg.user}
                      </span>
                      <span className="text-[8px] text-white/40">
                        {msg.tier}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-snug break-words">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-white/5 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="채팅..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="size-8 bg-white/10 text-white rounded-lg flex items-center justify-center hover:bg-white/15 transition-colors"
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
            <div className="h-11 px-4 border-b border-white/5 flex items-center shrink-0">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                댓글
              </span>
              <span className="text-[10px] text-white/45 ml-2">
                {comments.length}개
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0 custom-scrollbar">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <img
                    src={c.avatar}
                    alt=""
                    className="size-8 rounded-full object-cover shrink-0 border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-white/90">
                        {c.user}
                      </span>
                      <span className="text-[9px] text-white/45">
                        {c.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/80 leading-snug break-words mt-0.5">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={commentEndRef} />
            </div>
            <div className="p-3 border-t border-white/5 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCommentSubmit()}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/20"
                />
                <button
                  type="button"
                  onClick={handleCommentSubmit}
                  className="size-8 bg-violet-500/80 text-white rounded-lg flex items-center justify-center hover:brightness-110 transition-colors"
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
