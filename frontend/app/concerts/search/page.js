"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import {
  searchConcerts,
  getTicketStatus,
  getDaysUntilSaleStart,
  getArtistNamesArray,
  formatArtists,
  getPrimaryMeta,
} from "@/lib/concertUtils";
import Surface from "@/components/ui/Surface";

// TODO: 데이터 많을 경우 백엔드 검색 API(/api/concerts/search?q=)로 전환 권장
function ConcertSearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qFromUrl = searchParams?.get("q") ?? "";
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(qFromUrl);

  useEffect(() => {
    setSearchInput(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGet("/api/concerts")
      .then((data) => {
        if (!cancelled) setConcerts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err?.data?.message || err?.message || "목록을 불러오는데 실패했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const results = qFromUrl.trim() ? searchConcerts(concerts, qFromUrl) : [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = (searchInput || "").trim();
    if (q) router.push(`/concerts/search?q=${encodeURIComponent(q)}`);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-white/55">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-20 bg-[#0f0a1e]/95 backdrop-blur border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/concerts"
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white shrink-0"
              aria-label="목록으로"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
            </form>
          </div>
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
        <h1 className="text-lg font-bold text-white/90 mb-4 px-1">
          검색 결과 {results.length}개
        </h1>

        {results.length === 0 ? (
          <div className="py-16 text-center text-white/55 rounded-2xl border border-white/10 bg-white/5">
            {qFromUrl
              ? `"${qFromUrl}"에 대한 검색 결과가 없습니다. 다른 키워드로 검색해 보세요.`
              : "검색어를 입력하고 검색해 주세요."}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((c) => {
              const id = c.concertId ?? c.id;
              const placeName = c.placeName ?? c.venueName;
              const imageUrl = c.concertImageUrl ?? c.posterImageUrl;
              const status = getTicketStatus(c);
              const dday = getDaysUntilSaleStart(c);
              return (
                <Link key={id} href={`/concerts/${id}`}>
                  <Surface
                    variant="primary"
                    className="p-5 rounded-2xl border border-white/10 hover:border-violet-500/30 transition-all"
                  >
                    <div className="flex gap-4">
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt=""
                          className="w-20 h-20 rounded-xl object-cover shrink-0 border border-white/10"
                        />
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <h2 className="font-semibold text-white truncate">{c.title}</h2>
                        {getArtistNamesArray(c).length > 0 && (
                          <p className="text-white/85 text-sm mt-1 truncate flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-violet-400/80 text-[1rem] shrink-0" aria-hidden>
                              music_note
                            </span>
                            <span>{formatArtists(getArtistNamesArray(c))}</span>
                          </p>
                        )}
                        <p className="text-white/55 text-xs mt-1">{getPrimaryMeta(c) || placeName}</p>
                        {status === "UPCOMING" && dday != null && (
                          <span className="text-violet-400 font-medium text-sm mt-0.5">D-{dday}</span>
                        )}
                        {status === "OPEN" && (
                          <span className="text-emerald-400 font-medium text-sm mt-0.5">예매중</span>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-white/45 shrink-0">chevron_right</span>
                    </div>
                  </Surface>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ConcertSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-white/55">
          로딩 중...
        </div>
      }
    >
      <ConcertSearchPageInner />
    </Suspense>
  );
}
