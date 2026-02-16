"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { settlementApi } from "@/lib/settlementApi";

function formatKRW(value) {
  const num = Number(value || 0);
  return `${num.toLocaleString("ko-KR")}원`;
}

function toLocalStringWithZone(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  const localText = d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const zoneLabel = minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;

  return `${localText} (${zoneLabel})`;
}

function toUtcString(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";

  const utcText = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);

  return `${utcText} UTC`;
}

function LocalDateWithUtcTooltip({ iso }) {
  const localText = toLocalStringWithZone(iso);
  const utcText = toUtcString(iso);

  if (localText === "-") {
    return <span>-</span>;
  }

  return (
    <span className="relative inline-flex group cursor-help">
      <span>{localText}</span>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/15 bg-[#0e0b17] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        UTC: {utcText}
      </span>
    </span>
  );
}

function StatCard({ label, value, color = "text-white" }) {
  return (
    <Surface variant="primary" className="p-5">
      <p className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
    </Surface>
  );
}

export default function AdminSettlementsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [summaries, setSummaries] = useState([]);
  const [selectedArtistId, setSelectedArtistId] = useState(null);
  const [selectedArtistName, setSelectedArtistName] = useState("");

  const [historyPage, setHistoryPage] = useState({ content: [], number: 0, totalPages: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  const [selectedSettlementId, setSelectedSettlementId] = useState(null);
  const [details, setDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [failureSummary, setFailureSummary] = useState(null);
  const [failurePage, setFailurePage] = useState({ content: [], number: 0, totalPages: 0 });
  const [failureFilter, setFailureFilter] = useState("ALL");

  const [manualStartDate, setManualStartDate] = useState("");
  const [manualEndDate, setManualEndDate] = useState("");
  const [manualResult, setManualResult] = useState(null);
  const [manualRunning, setManualRunning] = useState(false);

  const loadSummaries = useCallback(async () => {
    const rows = await settlementApi.getAdminSummaries();
    setSummaries(Array.isArray(rows) ? rows : []);
  }, []);

  const loadHistory = useCallback(async (page = 0, artistId = null) => {
    setHistoryLoading(true);
    try {
      const params = { page: String(page), size: "10", sort: "settledAt,desc" };
      const res = artistId
        ? await settlementApi.getAdminArtistHistory(artistId, params)
        : await settlementApi.getAdminHistory(params);
      setHistoryPage(res || { content: [], number: 0, totalPages: 0 });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadFailureSummary = useCallback(async () => {
    const data = await settlementApi.getFailureSummary();
    setFailureSummary(data || null);
  }, []);

  const loadFailureLogs = useCallback(async (page = 0, filter = "ALL") => {
    const query = { page: String(page), size: "10", sort: "createdAt,desc" };
    if (filter === "PROCESSED") query.processed = "true";
    if (filter === "UNPROCESSED") query.processed = "false";
    const res = await settlementApi.getFailureLogs(query);
    setFailurePage(res || { content: [], number: 0, totalPages: 0 });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadSummaries(), loadHistory(0, selectedArtistId), loadFailureSummary(), loadFailureLogs(0, failureFilter)]);
    } catch (e) {
      setError(e?.message || "관리자 정산 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [failureFilter, loadFailureLogs, loadFailureSummary, loadHistory, loadSummaries, selectedArtistId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const summaryKpis = useMemo(() => {
    const totalFinal = summaries.reduce((acc, s) => acc + Number(s?.totalFinalAmount || 0), 0);
    const totalPending = summaries.reduce((acc, s) => acc + Number(s?.pendingEstimate || 0), 0);
    return {
      artistCount: summaries.length,
      totalFinal,
      totalPending,
    };
  }, [summaries]);

  async function onPickArtist(artistId, artistName) {
    setSelectedArtistId(artistId);
    setSelectedArtistName(artistName);
    await loadHistory(0, artistId);
  }

  async function onResetArtistFilter() {
    setSelectedArtistId(null);
    setSelectedArtistName("");
    await loadHistory(0, null);
  }

  async function onOpenDetails(settlementId) {
    setSelectedSettlementId(settlementId);
    setDetails([]);
    setDetailsLoading(true);
    try {
      const rows = await settlementApi.getAdminDetails(settlementId);
      setDetails(Array.isArray(rows) ? rows : []);
    } catch {
      setDetails([]);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function onRunManualBatch() {
    setManualRunning(true);
    setManualResult(null);
    try {
      const payload = {};
      if (manualStartDate) payload.startDate = manualStartDate;
      if (manualEndDate) payload.endDate = manualEndDate;
      const res = await settlementApi.executeManualBatch(payload);
      setManualResult(res);
      await Promise.all([
        loadSummaries(),
        loadHistory(0, selectedArtistId),
        loadFailureSummary(),
        loadFailureLogs(0, failureFilter),
      ]);
    } catch (e) {
      setManualResult({ status: "FAILED", message: e?.message || "실행에 실패했습니다." });
    } finally {
      setManualRunning(false);
    }
  }

  async function onChangeFailureFilter(nextFilter) {
    setFailureFilter(nextFilter);
    await loadFailureLogs(0, nextFilter);
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <SectionTitle className="text-2xl font-bold">정산 관리자</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">아티스트/그룹 정산 현황 조회와 수동 배치를 실행할 수 있습니다.</p>
        </div>
        <Button type="button" variant="primary" className="px-6 py-3 text-xs uppercase tracking-widest" onClick={loadAll}>
          새로고침
        </Button>
      </header>

      {error && (
        <Surface variant="primary" className="p-4 border border-red-500/30 text-red-300 text-sm font-semibold">
          {error}
        </Surface>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="정산 대상 수" value={loading ? "..." : `${summaryKpis.artistCount}명`} />
        <StatCard label="누적 지급액" value={loading ? "..." : formatKRW(summaryKpis.totalFinal)} color="text-violet-300" />
        <StatCard label="예상 정산액" value={loading ? "..." : formatKRW(summaryKpis.totalPending)} color="text-emerald-300" />
        <StatCard
          label="미처리 실패로그"
          value={loading ? "..." : `${failureSummary?.unprocessedCount || 0}건`}
          color="text-amber-300"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Surface variant="primary" className="p-6 xl:col-span-1 space-y-4">
          <h3 className="text-lg font-black text-white">수동 정산 배치</h3>
          <p className="text-xs text-white/60">비워두면 전월 1일~말일 기준으로 실행됩니다.</p>

          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-white/70">시작일</label>
            <input
              type="date"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-white"
              value={manualStartDate}
              onChange={(e) => setManualStartDate(e.target.value)}
            />
            <label className="block text-[11px] font-bold text-white/70">종료일</label>
            <input
              type="date"
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2 text-white"
              value={manualEndDate}
              onChange={(e) => setManualEndDate(e.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full py-3 text-xs uppercase tracking-widest"
            onClick={onRunManualBatch}
            disabled={manualRunning}
          >
            {manualRunning ? "실행 중..." : "배치 실행"}
          </Button>

          {manualResult && (
            <div
              className={`p-3 rounded-xl text-sm font-semibold ${
                manualResult.status === "SUCCESS"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : manualResult.status === "ALREADY_RUNNING"
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-red-500/15 text-red-300"
              }`}
            >
              {manualResult.message}
            </div>
          )}
        </Surface>

        <Surface variant="primary" className="xl:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-white/[0.06]">
            <h3 className="text-lg font-black text-white">정산 대상 요약</h3>
          </div>
          <div>
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.04] border-b border-white/[0.06]">
                  <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">대상</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">역할</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">누적 지급액</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">예상 정산액</th>
                  <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">동작</th>
                </tr>
              </thead>
              <tbody>
                {summaries.length === 0 && !loading && (
                  <tr>
                    <td className="px-6 py-8 text-white/60 font-semibold" colSpan={5}>
                      요약 데이터가 없습니다.
                    </td>
                  </tr>
                )}

                {summaries.map((s) => (
                  <tr key={s.artistId} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-white">{s.artistName}</p>
                      <p className="text-xs text-white/55">{s.groupName || "-"}</p>
                    </td>
                    <td className="px-6 py-5 text-white/80">{s.role}</td>
                    <td className="px-6 py-5 tabular-nums text-violet-300 font-bold">{formatKRW(s.totalFinalAmount)}</td>
                    <td className="px-6 py-5 tabular-nums text-emerald-300 font-bold">{formatKRW(s.pendingEstimate)}</td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                        onClick={() => onPickArtist(s.artistId, s.artistName)}
                      >
                        이력 보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      <Surface variant="primary" className="overflow-hidden">
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between gap-4">
          <h3 className="text-lg font-black text-white">
            정산 이력 {selectedArtistId ? `(대상: ${selectedArtistName})` : "(전체)"}
          </h3>
          {selectedArtistId && (
            <button
              type="button"
              className="text-[10px] font-black text-white/60 uppercase tracking-widest hover:text-white"
              onClick={onResetArtistFilter}
            >
              필터 해제
            </button>
          )}
        </div>

        <div>
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/[0.06]">
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">대상</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">기간</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">최종 지급액</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">지급일</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상세</th>
              </tr>
            </thead>
            <tbody>
              {!historyLoading && historyPage.content?.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-white/60 font-semibold" colSpan={5}>
                    정산 이력이 없습니다.
                  </td>
                </tr>
              )}

              {historyPage.content?.map((h) => (
                <tr key={h.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-5 text-white">{h.artistName || "-"}</td>
                  <td className="px-6 py-5 font-semibold text-white">{h.period}</td>
                  <td className="px-6 py-5 tabular-nums font-bold text-violet-300">{formatKRW(h.finalAmount)}</td>
                  <td className="px-6 py-5 text-sm text-white/70">
                    <LocalDateWithUtcTooltip iso={h.settledAt} />
                  </td>
                  <td className="px-6 py-5">
                    <button
                      type="button"
                      className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                      onClick={() => onOpenDetails(h.id)}
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="px-3 py-2 text-[10px]"
            disabled={historyPage.number <= 0 || historyLoading}
            onClick={() => loadHistory(historyPage.number - 1, selectedArtistId)}
          >
            이전
          </Button>
          <span className="text-xs text-white/65 px-2">
            {(historyPage.number || 0) + 1} / {Math.max(historyPage.totalPages || 1, 1)}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="px-3 py-2 text-[10px]"
            disabled={historyPage.number >= (historyPage.totalPages || 1) - 1 || historyLoading}
            onClick={() => loadHistory(historyPage.number + 1, selectedArtistId)}
          >
            다음
          </Button>
        </div>
      </Surface>

      {selectedSettlementId && (
        <Surface variant="primary" className="overflow-hidden">
          <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-lg font-black text-white">정산 상세 #{selectedSettlementId}</h3>
            <button
              type="button"
              className="text-[10px] font-black text-white/60 uppercase tracking-widest hover:text-white"
              onClick={() => {
                setSelectedSettlementId(null);
                setDetails([]);
              }}
            >
              닫기
            </button>
          </div>

          {detailsLoading ? (
            <div className="p-6 text-white/70 text-sm">불러오는 중...</div>
          ) : (
            <div>
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.04] border-b border-white/[0.06]">
                    <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상품명</th>
                    <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">원천</th>
                    <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">매출</th>
                    <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">비율</th>
                    <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">정산금</th>
                  </tr>
                </thead>
                <tbody>
                  {details.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-white/60 font-semibold" colSpan={5}>
                        상세 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                  {details.map((d) => (
                    <tr key={d.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-5 font-semibold text-white">{d.orderName}</td>
                      <td className="px-6 py-5 text-white/80">{d.sourceType}</td>
                      <td className="px-6 py-5 tabular-nums text-white/85">{formatKRW(d.salesAmount)}</td>
                      <td className="px-6 py-5 tabular-nums text-white/80">{d.shareRatio}</td>
                      <td className="px-6 py-5 tabular-nums font-bold text-violet-300">{formatKRW(d.settlementAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      )}

      <Surface variant="primary" className="overflow-hidden">
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between gap-4">
          <h3 className="text-lg font-black text-white">정산 실패 로그</h3>
          <div className="flex items-center gap-2">
            {[
              { id: "ALL", label: "전체" },
              { id: "UNPROCESSED", label: "미처리" },
              { id: "PROCESSED", label: "처리완료" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  failureFilter === f.id ? "bg-[#201a33] text-violet-300 border border-white/[0.08]" : "text-white/60"
                }`}
                onClick={() => onChangeFailureFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/[0.06]">
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">OrderNo</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">메시지</th>
                <th className="w-[110px] px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest whitespace-nowrap">상태</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">발생시각</th>
              </tr>
            </thead>
            <tbody>
              {failurePage.content?.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-white/60 font-semibold" colSpan={5}>
                    실패 로그가 없습니다.
                  </td>
                </tr>
              )}
              {failurePage.content?.map((f) => (
                <tr key={f.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-5 text-white/80">{f.id}</td>
                  <td className="px-6 py-5 text-white">{f.orderNo}</td>
                  <td className="px-6 py-5 text-white/75 line-clamp-1 max-w-[360px]">{f.errorMessage}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap leading-none ${
                        f.isProcessed ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {f.isProcessed ? "완료" : "미처리"}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-white/70">
                    <LocalDateWithUtcTooltip iso={f.createdAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="px-3 py-2 text-[10px]"
            disabled={failurePage.number <= 0}
            onClick={() => loadFailureLogs(failurePage.number - 1, failureFilter)}
          >
            이전
          </Button>
          <span className="text-xs text-white/65 px-2">
            {(failurePage.number || 0) + 1} / {Math.max(failurePage.totalPages || 1, 1)}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="px-3 py-2 text-[10px]"
            disabled={failurePage.number >= (failurePage.totalPages || 1) - 1}
            onClick={() => loadFailureLogs(failurePage.number + 1, failureFilter)}
          >
            다음
          </Button>
        </div>
      </Surface>
    </div>
  );
}
