"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { redirectToGuestHome } from "@/lib/authRedirect";

import { BASE_URL } from "@/lib/api";
const PAGE_SIZE = 10;

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/30";
const SELECT_CLASS =
  "w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/30";

function getPenaltyListParams(page, size, appliedSearchBy, appliedKeyword) {
  const params = { page, size };
  if (appliedKeyword.trim()) {
    params[appliedSearchBy === "nickname" ? "nickname" : "email"] = appliedKeyword.trim();
  }
  return params;
}

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PENALTY_TYPE_LABEL = {
  RESTRICT: "글/댓글 제한",
  WEEKEND_BAN: "1주일 정지",
  PERMANENT_BAN: "영구 정지",
};

function getVisiblePageNumbers(totalPages, currentPage, maxVisible = 5) {
  let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible);
  if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export default function AdminPenaltiesPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchBy, setSearchBy] = useState("nickname");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedSearchBy, setAppliedSearchBy] = useState("nickname");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }
    setLoading(true);
    setError("");
    const params = getPenaltyListParams(page, PAGE_SIZE, appliedSearchBy, appliedKeyword);
    axios
      .get(`${BASE_URL}/api/admin/mypage/penalties`, {
        headers,
        params,
      })
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(
          err.response?.status === 403
            ? "관리자만 접근할 수 있습니다."
            : "패널티 내역을 불러오지 못했습니다."
        )
      )
      .finally(() => setLoading(false));
  }, [page, appliedSearchBy, appliedKeyword]);

  const handleSearch = () => {
    setAppliedSearchBy(searchBy);
    setAppliedKeyword(searchKeyword);
    setPage(0);
  };

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const content = data?.content ?? [];

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header>
        <SectionTitle className="text-2xl font-bold">패널티 내역 조회</SectionTitle>
        <p className="text-sm text-white/55 font-medium mt-1">
          관리자가 부여한 패널티 기록과 현재 활성 상태를 확인합니다.
        </p>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Surface variant="primary" className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <label className="block text-xs font-medium text-white/55 mb-1">검색 조건</label>
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="nickname">닉네임</option>
              <option value="email">이메일</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label className="block text-xs font-medium text-white/55 mb-1">검색어</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={searchBy === "nickname" ? "닉네임 입력" : "이메일 입력"}
              className={INPUT_CLASS}
            />
          </div>
          <Button variant="primary" onClick={handleSearch}>
            검색
          </Button>
        </div>
      </Surface>

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">대상 회원</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">패널티</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">사유</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">시작일</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">종료일</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">부여일</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-white/55 text-sm">
                  불러오는 중...
                </td>
              </tr>
            ) : content.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-white/50 text-sm">
                  패널티 내역이 없습니다.
                </td>
              </tr>
            ) : (
              content.map((row) => {
                const active = row?.isActive ?? row?.active;
                return (
                <tr key={row.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-white text-sm">{row.userNickname}</p>
                  </td>
                  <td className="px-6 py-5 text-sm text-white/80">
                    {PENALTY_TYPE_LABEL[row.penaltyType] || row.penaltyType}
                  </td>
                  <td className="px-6 py-5 text-sm text-white/70 max-w-xs truncate" title={row.reason}>
                    {row.reason || "-"}
                  </td>
                  <td className="px-6 py-5 text-xs text-white/70">{formatDate(row.startedAt)}</td>
                  <td className="px-6 py-5 text-xs text-white/70">{formatDate(row.endedAt)}</td>
                  <td className="px-6 py-5 text-xs text-white/70">{formatDate(row.createdAt)}</td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        active
                          ? "bg-red-500/20 text-red-300"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {active ? "활성" : "종료"}
                    </span>
                  </td>
                </tr>
              );})
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/[0.06] flex items-center">
            <div className="flex-1" />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg bg-white/[0.06] text-white/80 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.1] transition-colors"
                aria-label="이전 페이지"
              >
                &lt;
              </button>
              {getVisiblePageNumbers(totalPages, page).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[2rem] py-2 px-2 rounded-lg text-xs font-bold transition-colors ${
                    p === page
                      ? "bg-violet-500 text-white"
                      : "bg-white/[0.06] text-white/80 hover:bg-white/[0.1]"
                  }`}
                >
                  {p + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg bg-white/[0.06] text-white/80 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.1] transition-colors"
                aria-label="다음 페이지"
              >
                &gt;
              </button>
            </div>
            <div className="flex-1 flex justify-end">
              <p className="text-[10px] text-white/55 font-medium">
                전체 {totalElements}건 · {page + 1} / {totalPages} 페이지
              </p>
            </div>
          </div>
        )}
      </Surface>
    </div>
  );
}
