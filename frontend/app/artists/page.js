"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BASE_URL } from "@/lib/api";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import Surface from "@/components/ui/Surface";

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
  const [error, setError] = useState("");

  const fetchArtists = useCallback((keyword = "") => {
    setLoading(true);
    const params = keyword.trim() ? { nickname: keyword.trim(), page: 0, size: 100 } : { page: 0, size: 100 };
    fetch(`${BASE_URL}/api/user/artists?${new URLSearchParams(params)}`, {
      headers: getAuthHeaders(),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("목록을 불러올 수 없습니다."))))
      .then((data) => {
        const list = data?.content ?? data ?? [];
        setArtists(Array.isArray(list) ? list : []);
        setError("");
      })
      .catch(() => {
        setArtists([]);
        setError("아티스트 목록을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchArtists(search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, fetchArtists]);

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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="아티스트 검색..."
            className="w-full bg-[#201a33] border border-white/[0.06] rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/[0.1] transition-all font-bold text-sm text-white placeholder:text-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          />
        </div>
      </header>

      {loading ? (
        <Surface variant="primary" className="p-12 text-center">
          <p className="text-white/55">아티스트 목록을 불러오는 중...</p>
        </Surface>
      ) : error ? (
        <Surface variant="primary" className="p-12 text-center">
          <p className="text-red-400/90">{error}</p>
        </Surface>
      ) : artists.length === 0 ? (
        <Surface variant="primary" className="p-12 text-center">
          <p className="text-white/55">표시할 아티스트가 없습니다.</p>
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
                className="p-8 flex flex-col items-center text-center h-full overflow-hidden"
              >
                <div className="relative mb-6">
                  <img
                    src={artist.profileImageUrl || getDefaultAvatarUrl(artist.nickname)}
                    className="size-28 rounded-2xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.35)] group-hover:scale-[1.02] transition-transform duration-200 ease-out object-cover"
                    alt={artist.nickname || ""}
                  />
                </div>
                <h3 className="text-2xl font-black text-white mb-4">
                  {artist.nickname || "아티스트"}
                </h3>
              </Surface>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
