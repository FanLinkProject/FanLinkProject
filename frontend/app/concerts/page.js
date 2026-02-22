"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { isUpcoming, getTicketStatus } from "@/lib/concertUtils";
import { NearbyConcertCarousel } from "@/components/concert/NearbyConcertCarousel";
import { TicketingSection } from "@/components/concert/TicketingSection";
import { MapView } from "@/components/concert/MapView";

const FILTER_UPCOMING = "upcoming";
const FILTER_OPEN = "open";
const FILTER_THIS_WEEK = "week";
const FILTER_THIS_MONTH = "month";

function filterByChip(concerts, chip) {
  const list = concerts.filter(isUpcoming);
  const now = new Date();
  if (chip === FILTER_OPEN) return list.filter((c) => getTicketStatus(c) === "OPEN");
  if (chip === FILTER_THIS_WEEK) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return list.filter((c) => {
      const start = new Date(c.startDateTime);
      return start >= now && start <= weekEnd;
    });
  }
  if (chip === FILTER_THIS_MONTH) {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return list.filter((c) => {
      const start = new Date(c.startDateTime);
      return start >= now && start <= monthEnd;
    });
  }
  return list;
}

export default function ConcertsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState("list");
  const [filterChip, setFilterChip] = useState(FILTER_UPCOMING);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = (searchQuery || "").trim();
    if (q) router.push(`/concerts/search?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    if (searchParams?.get("mode") === "map") setMode("map");
  }, [searchParams]);

  const mapCenter =
    searchParams?.get("lat") != null && searchParams?.get("lng") != null
      ? { lat: Number(searchParams.get("lat")), lng: Number(searchParams.get("lng")) }
      : null;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    apiGet("/api/concerts")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // 개발 시 artistNames 확인: console.log("[concerts] sample", list[0]);
        if (!cancelled) setConcerts(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.data?.message || err?.message || "목록을 불러오는데 실패했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = filterByChip(concerts, filterChip);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-white/55">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Sticky 탐색 바 */}
      <div className="sticky top-0 z-20 bg-[#0f0a1e]/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="공연 제목 / 아티스트 / 장소 검색"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/30"
              aria-label="검색"
            />
            <button
              type="submit"
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white shrink-0"
              title="검색"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "list" ? "map" : "list"))}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white shrink-0"
              title={mode === "list" ? "지도 보기" : "목록 보기"}
            >
              <span className="material-symbols-outlined">{mode === "list" ? "map" : "list"}</span>
            </button>
          </form>
          {/* 목록 뷰에서만 필터 칩 (다가오는/예매중/이번주/이번달) */}
          {mode === "list" && (
            <div className="flex gap-2 flex-wrap">
              {[
                { id: FILTER_UPCOMING, label: "다가오는 공연" },
                { id: FILTER_OPEN, label: "예매중만" },
                { id: FILTER_THIS_WEEK, label: "이번 주" },
                { id: FILTER_THIS_MONTH, label: "이번 달" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterChip(f.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filterChip === f.id ? "bg-violet-600 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-5xl mx-auto p-4">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400/90 text-sm">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {mode === "list" ? (
          <>
            <NearbyConcertCarousel concerts={filtered} />
            <TicketingSection concerts={filtered} status="OPEN" />
            <TicketingSection concerts={filtered} status="UPCOMING" />
            {filtered.length === 0 && (
              <div className="py-16 text-center text-white/55">
                다가오는 공연이 없습니다.
              </div>
            )}
          </>
        ) : (
          <MapView initialCenter={mapCenter} />
        )}
      </main>
    </div>
  );
}
