"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { BASE_URL } from "@/lib/api";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  return pure ? { Authorization: `Bearer ${pure}` } : {};
}

function formatKRW(n) {
  if (n == null || Number.isNaN(n)) return "0원";
  return `${Number(n).toLocaleString("ko-KR")}원`;
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

function TodoItem({ label, count, href }) {
  return (
    <Link
      href={href}
      className="block w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
    >
      <span className="text-sm font-bold text-white/80">{label}</span>
      <span className="text-sm font-black text-violet-300 bg-violet-500/20 px-2.5 py-1 rounded-lg tabular-nums">
        {count}
      </span>
    </Link>
  );
}

export default function BusinessDashboardPage() {
  const [mypageData, setMypageData] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [settlementHistory, setSettlementHistory] = useState(null);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      return;
    }
    axios
      .get(`${BASE_URL}/api/artist/mypage`, { headers })
      .then((res) => setMypageData(res.data ?? null))
      .catch(() => setMypageData(null));
  }, []);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get(`${BASE_URL}/api/artist/dashboard/summary`, { headers })
      .then((res) => setKpiData(res.data ?? null))
      .catch(() => setKpiData(null));
  }, []);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    axios
      .get(`${BASE_URL}/api/settlements/history`, { headers })
      .then((res) => setSettlementHistory(Array.isArray(res.data) ? res.data : null))
      .catch(() => setSettlementHistory(null));
  }, []);

  const profile = mypageData?.profile ?? null;
  const teamInfo = mypageData?.teamInfo ?? null;
  const isGroup = teamInfo?.type === "GROUP";
  const isArtistWithGroup = teamInfo?.type === "ARTIST" && (teamInfo?.members?.length ?? 0) > 0;
  const showMembersSection = isGroup || isArtistWithGroup;
  const members = teamInfo?.members ?? [];
  const displayName = isGroup ? (teamInfo?.groupName ?? profile?.nickname) : profile?.nickname ?? "아티스트";

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">Business Studio</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">{displayName}의 비즈니스 운영 현황입니다.</p>
        </div>
        {profile && (
          <div className="flex items-center gap-3 bg-white/[0.06] px-5 py-2.5 rounded-2xl border border-white/[0.06]">
            {profile.profileImageUrl && (
              <img
                src={profile.profileImageUrl}
                className="size-8 rounded-lg border border-white/[0.08] object-cover"
                alt=""
              />
            )}
            <span className="text-sm font-bold text-white/80">
              {displayName} {isGroup ? "(GROUP)" : ""}
            </span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox
          label="이번 달 총 매출"
          value={kpiData != null ? formatKRW(kpiData.monthlySales) : "—"}
          icon="payments"
          color="text-violet-300"
        />
        <KPIBox
          label="정산 가능 금액"
          value={kpiData != null ? formatKRW(kpiData.estimatedSettlement) : "—"}
          icon="account_balance_wallet"
          color="text-emerald-400"
        />
        <KPIBox
          label="배송 대기 상품"
          value={kpiData != null ? `${kpiData.pendingShipmentCount}건` : "—"}
          icon="local_shipping"
          color="text-white/70"
        />
        <KPIBox
          label="등록 상품 수"
          value={kpiData != null ? `${kpiData.productCount}개` : "—"}
          icon="inventory_2"
          color="text-white/55"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-8 space-y-8">
          {showMembersSection && (
            <Surface variant="primary" className="p-8">
              <div className="mb-6">
                <h3 className="text-lg font-black text-white">Members Management</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
                  >
                    <img
                      src={member.profileImageUrl || "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=800"}
                      className="size-12 rounded-xl border border-white/[0.08] object-cover"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{member.nickname ?? member.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-white/55 font-black uppercase">Active</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          <Surface variant="primary" className="p-8">
            <h3 className="text-lg font-black text-white mb-6">오늘의 비즈니스 할 일</h3>
            <div className="space-y-4">
              <TodoItem label="새로운 주문 알림" count={kpiData?.pendingShipmentCount ?? 0} href="/artist-console/orders" />
              <TodoItem label="배송 송장 입력 대기" count={kpiData?.pendingShipmentCount ?? 0} href="/artist-console/orders" />
              <TodoItem label="미답변 상품 문의" count={0} href="/artist-console/market" />
            </div>
          </Surface>
        </section>

        <aside className="lg:col-span-4 space-y-8">
          <Surface variant="primary" className="p-8 border border-violet-500/20">
            <h3 className="text-xl font-black text-white mb-2">정산 신청하기</h3>
            <p className="text-white/60 text-sm mb-8">지난 달의 수익 정산이 준비되었습니다. 지금 신청하여 지급을 받으세요.</p>
            <Button href="/artist-console/settlement" variant="primary" className="w-full py-4 text-xs uppercase tracking-widest">
              정산 신청 바로가기
            </Button>
          </Surface>

          <Surface variant="secondary" className="p-8">
            <h3 className="text-lg font-black text-white mb-6">최근 정산 내역</h3>
            <div className="space-y-3">
              {settlementHistory == null ? (
                <p className="text-[10px] text-white/55">로딩 중…</p>
              ) : settlementHistory.length === 0 ? (
                <p className="text-[10px] text-white/55">최근 정산 내역이 없습니다.</p>
              ) : (
                settlementHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04]">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white/80">{item.period} 정산</p>
                      <p className="text-[10px] text-white/55">{item.status === "COMPLETE" ? "지급 완료" : item.status}</p>
                    </div>
                    <span className="text-xs font-black text-white tabular-nums">{formatKRW(item.finalAmount)}</span>
                  </div>
                ))
              )}
            </div>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
