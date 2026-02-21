"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { redirectToGuestHome } from "@/lib/authRedirect";
import { settlementApi } from "@/lib/settlementApi";

import { BASE_URL } from "@/lib/api";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

function formatCount(n, suffix = "") {
  const v = Number(n || 0);
  return `${v.toLocaleString("ko-KR")}${suffix}`;
}

function formatKRW(n) {
  const v = Number(n || 0);
  return `${v.toLocaleString("ko-KR")}원`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function KPIBox({ label, value, icon, color }) {
  return (
    <Surface variant="primary" className="p-6 flex flex-col justify-between h-36">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-white/55 uppercase tracking-widest">{label}</span>
        <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
      </div>
      <p className="text-2xl font-black text-white tabular-nums">{value}</p>
    </Surface>
  );
}

export default function AdminDashboardPage() {
  const [kpi, setKpi] = useState({
    totalUsers: 0,
    activeArtists: 0,
    pendingReports: 0,
    pendingSettlements: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(true);
  const [recentSettlements, setRecentSettlements] = useState([]);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      redirectToGuestHome();
      return;
    }

    setKpiLoading(true);
    Promise.all([
      axios.get(`${BASE_URL}/api/admin/home`, { headers }),
      settlementApi.getAdminSummaries(),
      settlementApi.getAdminHistory({ page: "0", size: "3", sort: "settledAt,desc" }),
    ])
      .then(([homeRes, summaries, history]) => {
        const home = homeRes?.data ?? {};
        const users = home.userStatistics?.totalUsers ?? 0;
        const artists = home.artistStatistics?.totalArtists ?? 0;
        const groups = home.artistStatistics?.totalGroups ?? 0;
        const pendingReports = home.reportStatistics?.pendingReports ?? 0;
        const pendingSettlements = Array.isArray(summaries)
          ? summaries.filter((s) => Number(s?.pendingEstimate || 0) > 0).length
          : 0;

        setKpi({
          totalUsers: users,
          activeArtists: Number(artists) + Number(groups),
          pendingReports,
          pendingSettlements,
        });
        setRecentSettlements(Array.isArray(history?.content) ? history.content : []);
      })
      .catch(() => {
        setKpi({
          totalUsers: 0,
          activeArtists: 0,
          pendingReports: 0,
          pendingSettlements: 0,
        });
        setRecentSettlements([]);
      })
      .finally(() => setKpiLoading(false));
  }, []);

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header>
        <SectionTitle className="text-2xl font-bold">System Administrator</SectionTitle>
        <p className="text-sm text-white/55 font-medium mt-1">플랫폼 전체 운영 현황과 지표를 관리합니다.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox
          label="전체 회원수"
          value={kpiLoading ? "..." : formatCount(kpi.totalUsers, "명")}
          icon="group"
          color="text-white/80"
        />
        <KPIBox
          label="활성 아티스트"
          value={kpiLoading ? "..." : formatCount(kpi.activeArtists, "명")}
          icon="brush"
          color="text-violet-300"
        />
        <KPIBox
          label="미처리 신고"
          value={kpiLoading ? "..." : formatCount(kpi.pendingReports, "건")}
          icon="report"
          color="text-red-400/90"
        />
        <KPIBox
          label="정산 대기"
          value={kpiLoading ? "..." : formatCount(kpi.pendingSettlements, "건")}
          icon="payments"
          color="text-emerald-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-8 space-y-8">
          <Surface variant="primary" className="overflow-hidden">
            <h3 className="text-lg font-black text-white mb-6 px-8 pt-8">최근 정산 요청</h3>
            <div className="space-y-0">
              {kpiLoading ? (
                <div className="px-8 py-10 text-white/55 text-sm">불러오는 중...</div>
              ) : recentSettlements.length === 0 ? (
                <div className="px-8 py-10 text-white/50 text-sm">최근 정산 요청이 없습니다.</div>
              ) : (
                recentSettlements.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between p-4 px-8 border-t border-white/[0.06] first:border-t-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{row.artistName || "-"}</p>
                      <p className="text-[10px] text-white/55 font-black uppercase">
                        지급일: {formatDate(row.settledAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-white tabular-nums">{formatKRW(row.finalAmount)}</p>
                      <Link
                        href="/admin/settlements"
                        className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                      >
                        정산 관리
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Surface>
        </section>

        <aside className="lg:col-span-4 space-y-8">
          <Surface variant="primary" className="p-8">
            <h3 className="text-lg font-black text-white mb-6">운영 공지</h3>
            <p className="text-sm text-white/55">등록된 공지가 없습니다.</p>
            <Button href="/admin/notices" variant="primary" className="w-full mt-6 py-3 text-[10px] uppercase tracking-widest">
              공지 관리
            </Button>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
