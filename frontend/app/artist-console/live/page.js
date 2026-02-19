"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MOCK_LIVES } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { getCandidates, publish, ReplayAccessType } from "@/lib/replayApi";

const DEFAULT_ARTIST_ID = 1;

export default function ArtistLivePage() {
  const lives = MOCK_LIVES;
  const [artistId, setArtistId] = useState(DEFAULT_ARTIST_ID);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [publishForm, setPublishForm] = useState({
    liveSessionId: "",
    accessType: ReplayAccessType.FREE,
    title: "",
  });
  const [publishing, setPublishing] = useState(false);
  const [publishedReplay, setPublishedReplay] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoadingCandidates(true);
    setError(null);
    getCandidates(artistId)
      .then(setCandidates)
      .catch((e) => {
        setError(e?.data?.message || e.message || "후보 목록 조회 실패");
        setCandidates([]);
      })
      .finally(() => setLoadingCandidates(false));
  }, [artistId]);

  const handlePublish = async (e) => {
    e.preventDefault();
    const liveSessionId = Number(publishForm.liveSessionId);
    if (!liveSessionId) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await publish({
        artistId,
        liveSessionId,
        accessType: publishForm.accessType,
        title: publishForm.title || null,
      });
      setPublishedReplay(res);
      setPublishForm({
        liveSessionId: "",
        accessType: ReplayAccessType.FREE,
        title: "",
      });
    } catch (e) {
      setError(e?.data?.message || e.message || "발행 실패");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">
            라이브 관리
          </SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            라이브 스트리밍 일정을 관리하고 다시보기를 발행하세요.
          </p>
        </div>
        <Link
          href="/artist-console/live"
          className="px-6 py-3 bg-red-500/90 text-white rounded-full font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
        >
          라이브 시작하기
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {lives.map((live) => (
          <Surface key={live.id} variant="card" className="overflow-hidden">
            <div className="aspect-video relative overflow-hidden bg-white/5">
              <img
                src={live.thumbnail}
                className="w-full h-full object-cover"
                alt=""
              />
              <div className="absolute top-3 left-3">
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    live.status === "LIVE"
                      ? "bg-red-500/90 text-white"
                      : live.status === "UPCOMING"
                        ? "bg-white/20 text-white"
                        : "bg-white/10 text-white/90"
                  }`}
                >
                  {live.status}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h4 className="font-bold text-white truncate mb-2">
                {live.title}
              </h4>
              <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mb-4">
                {live.startTime}
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/live/${live.id}`}
                  className="flex-1 py-3 bg-[#201a33] border border-white/[0.08] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.06] transition-colors text-center"
                >
                  {live.status === "ENDED" ? "다시보기" : "시청하기"}
                </Link>
                <Button
                  variant="ghost"
                  className="flex-1 py-3 text-[10px] uppercase tracking-widest"
                >
                  설정
                </Button>
              </div>
            </div>
          </Surface>
        ))}
      </div>

      {/* 다시보기 발행 (Replay API) */}
      <Surface variant="primary" className="p-6">
        <SectionTitle className="text-lg font-bold mb-2">
          다시보기 발행
        </SectionTitle>
        <p className="text-sm text-white/55 mb-4">
          녹화 완료된 라이브 세션을 다시보기로 발행합니다. (ARTIST 본인 artistId
          필요)
        </p>
        <label className="block mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
            artistId
          </span>
          <input
            type="number"
            min="1"
            value={artistId}
            onChange={(e) => setArtistId(Number(e.target.value) || 1)}
            className="mt-1 w-24 bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
          />
        </label>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {publishedReplay && (
          <p className="text-green-400 text-sm mb-3">
            발행됨: replayId={publishedReplay.replayId}{" "}
            <Link
              href={`/replay/${publishedReplay.replayId}`}
              className="underline"
            >
              시청하기
            </Link>
          </p>
        )}
        <form onSubmit={handlePublish} className="space-y-3 max-w-md">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
              라이브 세션 (후보)
            </span>
            <select
              value={publishForm.liveSessionId}
              onChange={(e) =>
                setPublishForm((f) => ({ ...f, liveSessionId: e.target.value }))
              }
              className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
              required
            >
              <option value="">선택</option>
              {loadingCandidates && <option disabled>로딩 중...</option>}
              {candidates.map((c) => (
                <option key={c.liveSessionId} value={c.liveSessionId}>
                  liveSessionId {c.liveSessionId} (유료: {c.isPaid ? "Y" : "N"})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
              접근 타입
            </span>
            <select
              value={publishForm.accessType}
              onChange={(e) =>
                setPublishForm((f) => ({ ...f, accessType: e.target.value }))
              }
              className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
            >
              <option value={ReplayAccessType.FREE}>FREE</option>
              <option value={ReplayAccessType.PAID}>PAID</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
              제목 (선택)
            </span>
            <input
              type="text"
              maxLength={200}
              value={publishForm.title}
              onChange={(e) =>
                setPublishForm((f) => ({ ...f, title: e.target.value }))
              }
              className="mt-1 w-full bg-[#16102a] border border-white/[0.08] rounded-lg px-3 py-2 text-white"
            />
          </label>
          <Button type="submit" variant="primary" disabled={publishing}>
            {publishing ? "발행 중..." : "발행"}
          </Button>
        </form>
      </Surface>
    </div>
  );
}
