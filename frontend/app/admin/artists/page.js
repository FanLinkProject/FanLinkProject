"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { redirectToGuestHome } from "@/lib/authRedirect";

import { BASE_URL } from "@/lib/api";
const PAGE_SIZE = 10;

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function AdminArtistsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }
    setLoading(true);
    const params = { page, size: PAGE_SIZE };
    if (search.trim()) params.keyword = search.trim();
    axios
      .get(`${BASE_URL}/api/admin/artists`, { headers, params })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.status === 403 ? "관리자만 접근할 수 있습니다." : "목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const content = data?.content ?? [];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <SectionTitle className="text-2xl font-bold">아티스트 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">등록된 아티스트 및 그룹을 검토하고 승인합니다.</p>
        </div>
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/55 text-lg">search</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="닉네임 검색..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#201a33] border border-white/[0.06] rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20 font-medium text-sm text-white placeholder:text-white/40"
            />
          </form>
          <Button variant="ghost" href="/admin" className="text-xs uppercase tracking-widest">
            대시보드
          </Button>
        </div>
      </header>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <Surface variant="primary" className="p-12 text-center">
          <p className="text-sm text-white/55">불러오는 중...</p>
        </Surface>
      ) : content.length === 0 ? (
        <Surface variant="primary" className="p-12 text-center">
          <p className="text-sm text-white/50">등록된 아티스트/그룹이 없습니다.</p>
        </Surface>
      ) : (
        <div className="space-y-4">
          {content.map((artist) => (
            <Surface
              key={artist.id}
              variant="primary"
              className="p-8 flex items-center gap-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow"
            >
              <img
                src={artist.profileImageUrl || getDefaultAvatarUrl(artist.nickname)}
                alt=""
                className="size-16 rounded-2xl border border-white/[0.08] object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-white">{artist.nickname}</h3>
                <p className="text-[10px] text-white/55 font-medium mt-0.5">{artist.email}</p>
                <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mt-1">
                  {artist.role} · 가입일 {formatDate(artist.createdAt)}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                승인됨
              </span>
              <Link href={`/artists/${artist.id}`}>
                <Button variant="ghost" className="px-4 py-2 text-[10px] uppercase tracking-widest">
                  상세
                </Button>
              </Link>
            </Surface>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-[10px] text-white/55 font-medium">
                전체 {totalElements}명 · {page + 1} / {totalPages} 페이지
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/80 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.1] transition-colors"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/80 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.1] transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
