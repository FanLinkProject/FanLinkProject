"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { settlementApi } from "@/lib/settlementApi";

function StatCard({ label, value, color = "text-white" }) {
  return (
    <Surface variant="primary" className="p-6">
      <p className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
    </Surface>
  );
}

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

export default function ArtistSettlementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [estimate, setEstimate] = useState(null);
  const [history, setHistory] = useState([]);

  const [selectedSettlementId, setSelectedSettlementId] = useState(null);
  const [selectedSettlementPeriod, setSelectedSettlementPeriod] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [details, setDetails] = useState([]);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [estimateRes, historyRes] = await Promise.all([
        settlementApi.getMyEstimate(),
        settlementApi.getMyHistory(),
      ]);
      setEstimate(estimateRes);
      setHistory(Array.isArray(historyRes) ? historyRes : []);
    } catch (e) {
      setError(e?.message || "정산 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async (settlementId, period) => {
    setSelectedSettlementId(settlementId);
    setSelectedSettlementPeriod(period || "");
    setDetails([]);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const rows = await settlementApi.getMyDetails(settlementId);
      setDetails(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setDetailsError(e?.message || "정산 상세를 불러오지 못했습니다.");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  const summary = useMemo(() => {
    const totalFinal = history.reduce((acc, row) => acc + Number(row?.finalAmount || 0), 0);
    const totalSales = history.reduce((acc, row) => acc + Number(row?.totalSalesAmount || 0), 0);
    return {
      totalFinal,
      totalSales,
      count: history.length,
    };
  }, [history]);

  const selectedDetailTitle = useMemo(() => {
    const match = (selectedSettlementPeriod || "").match(/(\d{4})-(\d{2})-\d{2}/);
    if (!match) return "정산 상세";

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (Number.isNaN(year) || Number.isNaN(month)) return "정산 상세";

    return `${String(year).slice(2)}년 ${month}월 정산 상세`;
  }, [selectedSettlementPeriod]);

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <SectionTitle className="text-2xl font-bold">정산 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">정산 예상 금액과 지급 내역을 확인할 수 있습니다.</p>
        </div>
        <Button type="button" variant="primary" className="px-6 py-3 text-xs uppercase tracking-widest" onClick={loadBase}>
          새로고침
        </Button>
      </header>

      {error && (
        <Surface variant="primary" className="p-4 border border-red-500/30 text-red-300 text-sm font-semibold">
          {error}
        </Surface>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="이번달 예상 정산" value={loading ? "..." : formatKRW(estimate?.estimatedAmount)} color="text-violet-300" />
        <StatCard label="누적 지급액" value={loading ? "..." : formatKRW(summary.totalFinal)} />
        <StatCard label="누적 매출액" value={loading ? "..." : formatKRW(summary.totalSales)} color="text-white/80" />
        <StatCard label="정산 횟수" value={loading ? "..." : `${summary.count}건`} color="text-emerald-300" />
      </div>

      <Surface variant="primary" className="overflow-hidden">
        <div className="p-6 border-b border-white/[0.06]">
          <h3 className="text-lg font-black text-white">정산 지급 내역</h3>
        </div>

        <div className="overflow-x-auto settlement-scroll">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/[0.06]">
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">정산 기간</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">총 매출</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">수수료</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">최종 지급액</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">지급일</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상세</th>
              </tr>
            </thead>
            <tbody>
              {!loading && history.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-white/60 font-semibold" colSpan={6}>
                    정산 내역이 없습니다.
                  </td>
                </tr>
              )}

              {history.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-5 font-bold text-white">{row.period} (KST)</td>
                  <td className="px-6 py-5 font-bold text-white/85 tabular-nums">{formatKRW(row.totalSalesAmount)}</td>
                  <td className="px-6 py-5 font-bold text-white/70 tabular-nums">{formatKRW(row.feeAmount)}</td>
                  <td className="px-6 py-5 font-black text-violet-300 tabular-nums">{formatKRW(row.finalAmount)}</td>
                  <td className="px-6 py-5 text-sm text-white/70">
                    <LocalDateWithUtcTooltip iso={row.settledAt} />
                  </td>
                  <td className="px-6 py-5">
                    <button
                      type="button"
                      className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                      onClick={() => loadDetails(row.id, row.period)}
                    >
                      보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>

      {selectedSettlementId && (
        <Surface variant="primary" className="overflow-hidden">
          <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-lg font-black text-white">{selectedDetailTitle}</h3>
            <button
              type="button"
              className="text-[10px] font-black text-white/60 uppercase tracking-widest hover:text-white"
              onClick={() => {
                setSelectedSettlementId(null);
                setSelectedSettlementPeriod("");
                setDetails([]);
                setDetailsError("");
              }}
            >
              닫기
            </button>
          </div>

          {detailsLoading && <div className="p-6 text-white/70 text-sm">불러오는 중...</div>}
          {detailsError && <div className="p-6 text-red-300 text-sm font-semibold">{detailsError}</div>}

          {!detailsLoading && !detailsError && (
            <div className="overflow-x-auto settlement-scroll">
              <table className="w-full text-left border-collapse min-w-[700px]">
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
                        상세 내역이 없습니다.
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
    </div>
  );
}
