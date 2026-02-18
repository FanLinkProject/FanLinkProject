// Modified/Added files:
// - app/artist-console/live/page.js (start button -> navigate to create page)
// - app/artist-console/live/create/page.js (new live creation page)

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { MOCK_ARTISTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { apiGet, getToken, normalizeToken, WS_CHAT_URL } from "@/lib/api";

export default function ArtistLivePage() {
  const me = MOCK_ARTISTS[0];
  const artistIdForApi = me?.backendId ?? 1;

  const [liveSessions, setLiveSessions] = useState([]);
  const [replayCandidates, setReplayCandidates] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [replayError, setReplayError] = useState("");
  const [authError, setAuthError] = useState("");

  const fetchLiveData = useCallback(async () => {
    setAuthError("");
    setLiveError("");
    setReplayError("");
    setLiveLoading(true);
    setReplayLoading(true);

    const [liveResult, replayResult] = await Promise.allSettled([
      apiGet(`/api/live-sessions?artistId=${artistIdForApi}&status=LIVE`),
      apiGet(`/api/live-sessions?artistId=${artistIdForApi}`),
    ]);

    if (liveResult.status === "fulfilled") {
      const list = Array.isArray(liveResult.value) ? liveResult.value : [];
      setLiveSessions(list);
    } else {
      const e = liveResult.reason;
      console.error(e);
      if (e?.isAuth) {
        setAuthError("로그인이 필요합니다.");
      } else if (e?.isForbidden) {
        setAuthError("권한이 없습니다.");
      }
      setLiveSessions([]);
      setLiveError(e?.message || "진행 중 라이브를 불러오지 못했습니다.");
    }

    if (replayResult.status === "fulfilled") {
      const arr = Array.isArray(replayResult.value) ? replayResult.value : [];
      setReplayCandidates(arr);
    } else {
      const e = replayResult.reason;
      console.error(e);
      if (e?.isAuth) {
        setAuthError("로그인이 필요합니다.");
      } else if (e?.isForbidden) {
        setAuthError("권한이 없습니다.");
      }
      setReplayCandidates([]);
      setReplayError(e?.message || "다시보기 후보를 불러오지 못했습니다.");
    }

    setLiveLoading(false);
    setReplayLoading(false);
  }, [artistIdForApi]);

  useEffect(() => {
    fetchLiveData();
  }, [fetchLiveData]);

  // LIVE_LIST_CHANGED 수신 시 리스트만 state로 갱신 (폴링/새로고침 금지)
  const fetchLiveDataRef = useRef(fetchLiveData);
  fetchLiveDataRef.current = fetchLiveData;
  useEffect(() => {
    const token = getToken();
    const pure = token ? normalizeToken(token).replace(/^Bearer\s+/i, "") : "";
    if (!pure) return;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_CHAT_URL),
      connectHeaders: { Authorization: `Bearer ${pure}` },
      onConnect: () => {
        client.subscribe("/sub/live/global", (frame) => {
          try {
            const parsed = JSON.parse(frame.body);
            if (parsed && parsed.event === "LIVE_LIST_CHANGED") {
              fetchLiveDataRef.current?.();
            }
          } catch (_) {}
        });
      },
    });
    client.activate();
    return () => {
      try {
        client.deactivate();
      } catch (_) {}
    };
  }, []);

  const normalizedReplayCandidates = replayCandidates.filter((session) => {
    if (!session || typeof session !== "object") return false;
    const status = session.status;
    if (!status) return true;
    return status === "RECORDED" || status === "READY";
  });

  const handlePublishReplayClick = () => {
    alert("다시보기 발행 기능은 추후 연동 예정입니다.");
  };

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">라이브 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">라이브 스트리밍 일정을 관리하고 다시보기를 발행하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="px-4 py-2 text-[10px] uppercase tracking-widest"
            onClick={fetchLiveData}
          >
            새로고침
          </Button>
          <Link
            href="/artist-console/live/create"
            className="px-6 py-3 bg-red-500/90 text-white rounded-full font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
          >
            라이브 시작하기
          </Link>
        </div>
      </header>

      {authError && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {authError}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-white/55 px-1">진행 중 라이브</h2>
        {liveLoading ? (
          <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/10">
            <p className="text-white/55 text-sm">불러오는 중...</p>
          </div>
        ) : liveError && !authError ? (
          <div className="py-4 px-4 rounded-2xl bg-red-500/10 border border-red-500/40">
            <p className="text-xs text-red-200">{liveError}</p>
          </div>
        ) : liveSessions.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/10">
            <p className="text-white/55 text-sm">현재 진행 중인 라이브가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveSessions.map((live) => (
              <Surface key={live.id} variant="card" className="overflow-hidden">
                <div className="aspect-video relative overflow-hidden bg-white/5">
                  <img src="https://picsum.photos/seed/live/800/450" className="w-full h-full object-cover" alt="" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/90 text-white">
                      LIVE
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-black/40 text-white/90">
                      {live.isPaid ? "유료 라이브" : "무료 라이브"}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-white truncate mb-2">{live.title ?? "라이브"}</h4>
                  <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mb-4">
                    {live.isPaid ? "멤버십 전용" : "전체 공개"}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/live/${live.id}`}
                      className="flex-1 py-3 bg-[#201a33] border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors text-center"
                    >
                      시청하기
                    </Link>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-white/55 px-1">다시보기 발행 가능 목록</h2>
        {replayLoading ? (
          <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/10">
            <p className="text-white/55 text-sm">불러오는 중...</p>
          </div>
        ) : replayError && !authError ? (
          <div className="py-4 px-4 rounded-2xl bg-red-500/10 border border-red-500/40">
            <p className="text-xs text-red-200">{replayError}</p>
          </div>
        ) : normalizedReplayCandidates.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-[#201a33] border border-white/10">
            <p className="text-white/55 text-sm">발행 가능한 다시보기가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {normalizedReplayCandidates.map((session) => {
              const status = session.status;
              const isRecorded = status === "RECORDED";
              const isReady = status === "READY";
              const badgeLabel = isRecorded || isReady ? status : "다시보기 후보";
              const badgeClass = isRecorded
                ? "bg-white/10 text-white"
                : isReady
                  ? "bg-violet-500/80 text-white"
                  : "bg-white/10 text-white/80";

              return (
                <Surface key={session.id} variant="card" className="overflow-hidden">
                  <div className="aspect-video relative overflow-hidden bg-white/5">
                    <img
                      src="https://picsum.photos/seed/vod/800/450"
                      className="w-full h-full object-cover"
                      alt=""
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h4 className="font-bold text-white truncate mb-4">{session.title ?? "라이브 다시보기"}</h4>
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full py-3 text-[10px] uppercase tracking-widest"
                      onClick={handlePublishReplayClick}
                    >
                      다시보기 발행
                    </Button>
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
