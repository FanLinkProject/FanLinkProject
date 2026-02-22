"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import { BASE_URL } from "@/lib/api";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

export default function ArtistsListPage() {
  const [search, setSearch] = useState("");
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const size = 24;

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      setArtists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = { page, size };
    if (search.trim()) params.nickname = search.trim();
    axios
      .get(`${BASE_URL}/api/user/artists/list`, { headers, params })
      .then((res) => {
        const content = res.data?.content ?? [];
        setArtists(Array.isArray(content) ? content : []);
        setTotalPages(res.data?.totalPages ?? 0);
      })
      .catch(() => setArtists([]))
      .finally(() => setLoading(false));
  }, [page, search]);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-4">
            Explore Artists
          </h1>
          <p className="text-white/80 font-medium leading-relaxed italic">
            새로운 영감을 주는 아티스트들을 발견하고 그들의 여정에 함께하세요.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/55">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="아티스트 검색..."
            className="w-full bg-[#201a33] border border-white/[0.06] rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/[0.1] transition-all font-bold text-sm text-white placeholder:text-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          />
        </div>
      </header>

      {loading ? (
        <Surface variant="primary" className="py-12 text-center">
          <p className="text-white/55">아티스트를 불러오는 중...</p>
        </Surface>
      ) : artists.length === 0 ? (
        <Surface variant="primary" className="py-12 text-center">
          <p className="text-white/55">
            {getAuthHeaders().Authorization
              ? "표시할 아티스트 그룹이 없습니다."
              : "로그인하면 아티스트 그룹 목록을 볼 수 있습니다."}
          </p>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.id}`}
              className="group flex flex-col"
            >
              <Surface
                variant="card"
                className="p-8 flex flex-col items-center text-center h-full overflow-hidden w-full min-w-0"
              >
                <div className="relative mb-6 shrink-0">
                  <img
                    src={
                      artist.profileImageUrl ||
                      `https://picsum.photos/seed/artist-${artist.id}/200/200`
                    }
                    className="size-28 rounded-2xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.35)] group-hover:scale-[1.02] transition-transform duration-200 ease-out object-cover"
                    alt={artist.nickname || ""}
                  />
                </div>
                <h3 className="text-2xl font-black text-white mb-4 w-full min-w-0 truncate px-1" title={artist.nickname || ""}>
                  {artist.nickname || ""}
                </h3>
                <p className="text-sm text-white/80 leading-relaxed font-medium line-clamp-3 mb-8 min-h-[3rem] w-full min-w-0 break-words px-1">
                  {artist.name || ""}
                </p>
                <div className="flex gap-4 w-full pt-6 border-t border-white/10">
                  <div className="flex-1 text-center">
                    <p className="text-xs font-black text-white">
                      {artist.followerCount ?? 0}
                    </p>
                    <p className="text-[9px] font-bold text-white/55 uppercase tracking-widest mt-1">
                      Fans
                    </p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-xs font-black text-white">
                      {artist.postCount ?? 0}
                    </p>
                    <p className="text-[9px] font-bold text-white/55 uppercase tracking-widest mt-1">
                      Posts
                    </p>
                  </div>
                </div>
              </Surface>
            </Link>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-8">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/15"
          >
            이전
          </button>
          <span className="px-4 py-2 text-white/70 font-medium">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/15"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
