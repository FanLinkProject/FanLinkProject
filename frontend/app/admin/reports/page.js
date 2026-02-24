"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
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
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORY_LABEL = {
  SPAM: "스팸",
  ABUSE: "욕설/비방",
  FRAUD: "사기/사칭",
  PLASTER: "도배",
  OTHER: "기타",
};

const PENALTY_TYPE_LABEL = {
  DISMISS: "신고 기각",
  RESTRICT: "글/댓글 제한",
  WEEKEND_BAN: "1주일 정지",
  PERMANENT_BAN: "영구 정지",
};

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-500/30";
const SELECT_CLASS =
  "w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/30";

function getReportListParams(page, size, appliedSearchBy, appliedKeyword, appliedStatus) {
  const params = { page, size };
  if (appliedKeyword.trim()) {
    params[appliedSearchBy === "nickname" ? "nickname" : "email"] = appliedKeyword.trim();
  }
  if (appliedStatus === "true") params.status = true;
  if (appliedStatus === "false") params.status = false;
  return params;
}

function getVisiblePageNumbers(totalPages, currentPage, maxVisible = 5) {
  let start = Math.max(0, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible);
  if (end - start < maxVisible) start = Math.max(0, end - maxVisible);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export default function AdminReportsPage() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchBy, setSearchBy] = useState("nickname"); // "nickname" | "email"
  const [searchKeyword, setSearchKeyword] = useState(""); // 닉네임 또는 이메일 검색어
  const [searchStatus, setSearchStatus] = useState(""); // "" 전체, "false" 미처리, "true" 처리완료
  const [appliedSearchBy, setAppliedSearchBy] = useState("nickname");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");

  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [showPenaltyForm, setShowPenaltyForm] = useState(false);
  const [penaltyType, setPenaltyType] = useState("RESTRICT");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [penaltyMessage, setPenaltyMessage] = useState("");

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }
    setLoading(true);
    setError("");
    const params = getReportListParams(page, PAGE_SIZE, appliedSearchBy, appliedKeyword, appliedStatus);
    axios
      .get(`${BASE_URL}/api/admin/mypage/reports`, {
        headers,
        params,
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(
          err.response?.status === 403
            ? "관리자만 접근할 수 있습니다."
            : "신고 내역을 불러오지 못했습니다."
        );
      })
      .finally(() => setLoading(false));
  }, [page, appliedSearchBy, appliedKeyword, appliedStatus]);

  const handleSearch = () => {
    setAppliedSearchBy(searchBy);
    setAppliedKeyword(searchKeyword);
    setAppliedStatus(searchStatus);
    setPage(0);
  };

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const content = data?.content ?? [];

  const openDetail = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
    setShowPenaltyForm(false);
    setPenaltyType("RESTRICT");
    setPenaltyReason("");
    setPenaltyMessage("");
  };

  const submitPenalty = async () => {
    const headers = getAuthHeaders();
    const isDismiss = penaltyType === "DISMISS";

    if (isDismiss) {
      setPenaltyLoading(true);
      setPenaltyMessage("");
      try {
        await axios.patch(
          `${BASE_URL}/api/admin/mypage/reports/${selectedReport.reportId}/dismiss`,
          null,
          { headers }
        );
        setPenaltyMessage("신고를 기각했습니다.");
        setSelectedReport((prev) => (prev ? { ...prev, status: true } : null));
        setShowPenaltyForm(false);
        if (data?.content) {
          setData({
            ...data,
            content: data.content.map((row) =>
              row.reportId === selectedReport.reportId ? { ...row, status: true } : row
            ),
          });
        }
      } catch (err) {
        setPenaltyMessage(
          err.response?.data?.message || "신고 기각 처리에 실패했습니다."
        );
      } finally {
        setPenaltyLoading(false);
      }
      return;
    }

    if (!selectedReport?.reportedUserId) return;
    if (!penaltyReason.trim()) {
      setPenaltyMessage("패널티 사유를 입력해주세요.");
      return;
    }
    setPenaltyLoading(true);
    setPenaltyMessage("");
    try {
      await axios.post(
        `${BASE_URL}/api/admin/penalties`,
        {
          userId: selectedReport.reportedUserId,
          penaltyType,
          reason: penaltyReason.trim(),
        },
        { headers }
      );
      setPenaltyMessage("패널티를 부여했습니다.");
      setShowPenaltyForm(false);
      setShowDetailModal(false);
    } catch (err) {
      setPenaltyMessage(
        err.response?.data?.message || "패널티 부여에 실패했습니다."
      );
    } finally {
      setPenaltyLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <SectionTitle className="text-2xl font-bold">신고 내역 조회</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            사용자 신고 내역을 확인하고 상세에서 바로 패널티를 부여할 수 있습니다.
          </p>
        </div>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Surface variant="primary" className="p-6 mb-6">
        <p className="text-[10px] font-black text-white/55 uppercase tracking-widest mb-3">검색</p>
        <div className="flex items-end gap-3 w-full">
          <div className="w-24 shrink-0">
            <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">처리 상태</label>
            <select
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">전체</option>
              <option value="false">미처리</option>
              <option value="true">처리 완료</option>
            </select>
          </div>
          <div className="w-28 shrink-0">
            <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">검색 조건</label>
            <select
              value={searchBy}
              onChange={(e) => {
                setSearchBy(e.target.value);
                setSearchKeyword("");
              }}
              className={SELECT_CLASS}
            >
              <option value="nickname">닉네임</option>
              <option value="email">이메일</option>
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] text-white/50 uppercase tracking-wider mb-1">검색어</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="검색어를 입력하세요."
              className={INPUT_CLASS}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="shrink-0 px-5 py-2 rounded-xl bg-violet-500/90 text-white text-sm font-bold hover:brightness-110 transition-colors"
          >
            검색
          </button>
        </div>
      </Surface>

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">신고자</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">피신고자</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">카테고리</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">처리 상태</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">접수일</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-white/55 text-sm">
                  불러오는 중...
                </td>
              </tr>
            ) : content.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-white/50 text-sm">
                  신고 내역이 없습니다.
                </td>
              </tr>
            ) : (
              content.map((row) => (
                <tr key={row.reportId} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-white text-sm">{row.reporterUserNickname}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-white text-sm">{row.reportedUserNickname}</p>
                  </td>
                  <td className="px-6 py-5 text-sm text-white/80">
                    {CATEGORY_LABEL[row.category] || row.category}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        row.status
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {row.status ? "처리 완료" : "미처리"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-white/70">{formatDate(row.createdAt)}</td>
                  <td className="px-6 py-5">
                    <button
                      type="button"
                      onClick={() => openDetail(row)}
                      className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))
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

      {showDetailModal && selectedReport && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDetailModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-detail-title"
        >
          <Surface
            variant="primary"
            className="w-full max-w-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 id="report-detail-title" className="text-lg font-black text-white">신고 내역 상세</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                aria-label="닫기"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">신고자</p>
                <p className="text-white font-bold">{selectedReport.reporterUserNickname}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">피신고자</p>
                <p className="text-white font-bold">{selectedReport.reportedUserNickname}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">카테고리</p>
                <p className="text-white">{CATEGORY_LABEL[selectedReport.category] || selectedReport.category}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">처리 상태</p>
                <p className="text-white">{selectedReport.status ? "처리 완료" : "미처리"}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <p className="text-[10px] text-white/50 uppercase tracking-wider mb-2">신고 사유 상세</p>
              <p className="text-sm text-white/85 whitespace-pre-wrap">
                {selectedReport.reasonDetail || "사유 없음"}
              </p>
            </div>

            {penaltyMessage && (
              <p className={`text-sm ${penaltyMessage.includes("실패") ? "text-red-400" : "text-emerald-300"}`}>
                {penaltyMessage}
              </p>
            )}

            {showPenaltyForm ? (
              <div className="space-y-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <p className="text-xs font-bold text-white/70">패널티 부여</p>
                <select
                  value={penaltyType}
                  onChange={(e) => setPenaltyType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm"
                >
                  {Object.keys(PENALTY_TYPE_LABEL).map((type) => (
                    <option key={type} value={type}>
                      {PENALTY_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
                {penaltyType !== "DISMISS" && (
                  <textarea
                    value={penaltyReason}
                    onChange={(e) => setPenaltyReason(e.target.value)}
                    rows={3}
                    placeholder="패널티 사유를 입력하세요"
                    className="w-full px-4 py-3 rounded-xl bg-[#201a33] text-white border border-white/[0.06] text-sm resize-y"
                  />
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPenaltyForm(false)}
                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-white/80 text-xs font-bold hover:bg-white/[0.1]"
                  >
                    취소
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    className="px-4 py-2 text-xs rounded-xl"
                    onClick={submitPenalty}
                    disabled={penaltyLoading}
                  >
                    {penaltyLoading ? "처리 중..." : "패널티 부여"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2">
                {!selectedReport.status && (
                  <Button
                    type="button"
                    variant="primary"
                    className="px-4 py-2 text-xs rounded-xl"
                    onClick={() => setShowPenaltyForm(true)}
                  >
                    패널티 부여
                  </Button>
                )}
              </div>
            )}
          </Surface>
        </div>
      )}
    </div>
  );
}
