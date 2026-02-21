"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { redirectToGuestHome } from "@/lib/authRedirect";

const BASE_URL = "http://localhost:8080";
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

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
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
      .get(`${BASE_URL}/api/admin/users`, { headers, params })
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
          <SectionTitle className="text-2xl font-bold">회원 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">팬(일반 유저) 계정 목록을 관리합니다.</p>
        </div>
        <form onSubmit={handleSearch} className="relative w-80">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/55">search</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="회원 이름 또는 이메일 검색..."
            className="w-full pl-12 pr-6 py-3 bg-[#201a33] border border-white/[0.06] rounded-2xl outline-none focus:ring-2 focus:ring-violet-500/20 font-bold text-sm text-white placeholder:text-white/40"
          />
        </form>
      </header>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">회원 정보</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">구분</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">가입일</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상태</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-white/55 text-sm">불러오는 중...</td>
              </tr>
            ) : content.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-white/50 text-sm">회원이 없습니다.</td>
              </tr>
            ) : (
              content.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={getDefaultAvatarUrl(row.nickname)}
                        className="size-10 rounded-full border border-white/[0.08] object-cover"
                        alt=""
                      />
                      <div>
                        <p className="font-bold text-white">{row.nickname}</p>
                        <p className="text-[10px] text-white/55 font-medium">{row.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        row.role === "ARTIST" || row.role === "GROUP" ? "bg-violet-500/20 text-violet-300" : "bg-white/10 text-white/60"
                      }`}
                    >
                      {row.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm text-white/70 font-medium">{formatDate(row.createdAt)}</td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                      {row.status === "ACTIVE" ? "활성" : row.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <button type="button" className="text-[10px] font-black text-red-400/90 uppercase tracking-widest hover:underline">
                      정지
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-8 py-4 border-t border-white/[0.06] flex items-center justify-between">
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
      </Surface>
    </div>
  );
}
