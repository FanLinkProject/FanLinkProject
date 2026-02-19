"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getReplay, access } from "@/lib/replayApi";

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
        setPlaybackUrl(url);
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

  if (loading && !replay) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/70">로딩 중...</p>
      </div>
    );
  }

  if (error && !playbackUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-red-400 text-center">{error}</p>
        <Link href="/" className="text-white/70 hover:text-white underline">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col items-center p-4">
        <div className="w-full max-w-4xl">
          {playbackUrl && (
            <video
              ref={videoRef}
              src={playbackUrl}
              controls
              className="w-full aspect-video bg-black rounded-lg"
              crossOrigin="use-credentials"
              playsInline
            />
          )}
          {replay && (
            <div className="mt-4 text-white/80">
              <h1 className="text-xl font-bold truncate">
                다시보기 #{replay.replayId}
              </h1>
              <p className="text-sm text-white/55 mt-1">
                {replay.accessType} · {replay.status}
              </p>
            </div>
          )}
          <Link
            href="/"
            className="inline-block mt-6 text-white/70 hover:text-white underline"
          >
            ← 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
