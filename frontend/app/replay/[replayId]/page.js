"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getReplay, access } from "@/lib/replayApi";

function useHls(videoRef, playbackUrl) {
  useEffect(() => {
    if (!playbackUrl || !videoRef?.current) return;
    const isHls = playbackUrl.includes(".m3u8");
    if (!isHls) return;
    let hls = null;
    const loadHls = async () => {
      try {
        const Hls = (await import("hls.js")).default;
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true });
          hls.loadSource(playbackUrl);
          hls.attachMedia(videoRef.current);
        } else if (videoRef.current?.canPlayType?.("application/vnd.apple.mpegurl")) {
          videoRef.current.src = playbackUrl;
        }
      } catch {
        videoRef.current.src = playbackUrl;
      }
    };
    loadHls();
    return () => { if (hls) hls.destroy(); };
  }, [playbackUrl, videoRef]);
}

export default function ReplayWatchPage({ params }) {
  const resolvedParams = typeof params?.then === "function" ? null : params;
  const replayId = resolvedParams?.replayId
    ? Number(resolvedParams.replayId)
    : null;

  const [replay, setReplay] = useState(null);
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!replayId) {
      setError("replayId가 없습니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getReplay(replayId)
      .then((data) => {
        setReplay(data);
        return data;
      })
      .catch((e) => {
        setError(e?.data?.message || e.message || "다시보기 조회 실패");
        setLoading(false);
      });
  }, [replayId]);

  useEffect(() => {
    if (!replay || playbackUrl) return;
    access(replayId)
      .then((result) => {
        const url =
          result?.playbackUrl ??
          result?.response?.playbackUrl ??
          replay.playbackUrl;
        setPlaybackUrl(url || null);
      })
      .catch((e) => {
        setError(
          e?.data?.message ||
            e.message ||
            "접근 권한이 없거나 구독이 필요합니다.",
        );
      })
      .finally(() => setLoading(false));
  }, [replay, replayId, playbackUrl]);

  useHls(videoRef, playbackUrl);
  const isHls = playbackUrl?.includes(".m3u8");
  const videoSrc = !isHls ? playbackUrl : undefined;

  if (loading && !replay) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/70">로딩 중...</p>
      </div>
    );
  }

  const isPaidError = error?.includes("구독") || error?.includes("SUBSCRIPTION");
  const backHref = replay?.artistId ? `/artists/${replay.artistId}?tab=LIVE` : "/";

  if (error && !playbackUrl) {
    return (
      <div className="min-h-screen bg-[#0d0b15] flex flex-col items-center justify-center gap-6 p-6">
        {isPaidError ? (
          <div className="text-center space-y-4 max-w-md">
            <span className="material-symbols-outlined text-6xl text-violet-400/60 fill-icon">lock</span>
            <h2 className="text-xl font-bold text-white">멤버십 전용 다시보기</h2>
            <p className="text-white/55 text-sm leading-relaxed">
              이 다시보기는 유료 멤버십 회원만 시청할 수 있습니다.<br />
              멤버십에 가입하면 모든 프리미엄 콘텐츠를 즐길 수 있어요.
            </p>
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-500/90 text-white rounded-full font-bold text-sm hover:brightness-110 transition-all"
            >
              아티스트 페이지로 이동
            </Link>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <span className="material-symbols-outlined text-5xl text-red-400/60">error</span>
            <p className="text-red-400">{error}</p>
            <Link href={backHref} className="text-white/70 hover:text-white underline text-sm">
              돌아가기
            </Link>
          </div>
        )}
      </div>
    );
  }

  const displayTitle = replay?.title || (replay?.replayId ? `다시보기 #${replay.replayId}` : "다시보기");
  const publishedDate = replay?.publishedAt
    ? new Date(replay.publishedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-[#0d0b15] flex flex-col">
      <div className="flex-1 flex flex-col items-center p-4 sm:p-8">
        <div className="w-full max-w-4xl space-y-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-white/50 hover:text-violet-300 font-bold text-xs uppercase tracking-widest transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            돌아가기
          </Link>

          <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
            {replay?.thumbnailUrl && !playbackUrl && (
              <div className="w-full aspect-video relative">
                <img src={replay.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="size-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-4xl fill-icon">play_arrow</span>
                  </div>
                </div>
              </div>
            )}
            {playbackUrl && (
              <video
                ref={videoRef}
                src={videoSrc}
                controls
                autoPlay
                className="w-full aspect-video bg-black"
                crossOrigin="use-credentials"
                playsInline
              />
            )}
          </div>

          {replay && (
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-white">
                {displayTitle}
              </h1>
              <div className="flex items-center gap-3 text-sm text-white/50">
                {publishedDate && <span>{publishedDate}</span>}
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                  replay.accessType === "PAID"
                    ? "bg-violet-500/20 text-violet-300 border border-violet-400/30"
                    : "bg-white/[0.06] text-white/50"
                }`}>
                  {replay.accessType === "PAID" ? "멤버십" : "무료"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
