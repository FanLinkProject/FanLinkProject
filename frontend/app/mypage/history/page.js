"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import { getMypage } from "@/lib/userApi";

const TABS = [
  { id: "CANDY_RECHARGE", label: "캔디 충전" },
  { id: "MEMBERSHIP_USE", label: "멤버십 사용" },
  { id: "GOODS_BUY", label: "상품 구매" },
];

function formatDate(str) {
  if (!str) return "—";
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(".", ".");
  } catch (_) {
    return str;
  }
}

export default function PaymentHistoryPage() {
  const [activeTab, setActiveTab] = useState("GOODS_BUY");
  const [loading, setLoading] = useState(true);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [memberships, setMemberships] = useState([]);

  useEffect(() => {
    getMypage()
      .then((data) => {
        setPurchaseHistory(data.purchaseHistory ?? []);
        setMemberships(data.memberships ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const candyRechargeList = []; // 캔디 충전 전용 API 없음
  const membershipList = memberships.map((m) => ({
    id: `SUB-${m.subscriptionId}`,
    date: formatDate(m.endDate),
    name: m.productName,
    amount: "- 캔디",
    status: m.isActive ? "구독 중" : "만료",
  }));
  const goodsList = purchaseHistory.map((o) => ({
    id: o.orderNo,
    date: formatDate(o.createdAt),
    name: o.orderName,
    amount: o.totalAmount != null ? `${Number(o.totalAmount).toLocaleString()}원` : "—",
    status: o.status ?? "—",
  }));

  const historyData = {
    CANDY_RECHARGE: candyRechargeList,
    MEMBERSHIP_USE: membershipList,
    GOODS_BUY: goodsList,
  };
  const currentHistory = historyData[activeTab];

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-4xl mx-auto flex items-center justify-center min-h-[30vh]">
        <p className="text-white/55 font-medium">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <SectionTitle className="text-2xl font-bold">내역 관리</SectionTitle>
        <Link
          href="/mypage"
          className="size-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.1] transition-all"
        >
          <span className="material-symbols-outlined">close</span>
        </Link>
      </header>

      <div className="flex gap-2 p-1 bg-white/[0.04] rounded-2xl w-fit flex-wrap border border-white/[0.06]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? "bg-[#201a33] text-violet-300 border border-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                : "text-white/55 hover:text-white/80 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {currentHistory.map((item) => (
          <Surface
            key={item.id}
            variant="primary"
            className="p-8 flex flex-col md:flex-row justify-between md:items-center gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white/45 uppercase tracking-[0.2em]">
                  {item.date}
                </span>
                <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest">
                  #{item.id}
                </span>
              </div>
              <h4 className="text-lg font-bold text-white">{item.name}</h4>
              <p
                className={`font-black text-xl ${
                  activeTab === "MEMBERSHIP_USE"
                    ? "text-red-400/90"
                    : "text-white/90"
                }`}
              >
                {item.amount}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  ["배송 완료", "충전 완료", "구독 완료"].includes(item.status)
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-violet-500/20 text-violet-300"
                }`}
              >
                {item.status}
              </span>
            </div>
          </Surface>
        ))}
        {currentHistory.length === 0 && (
          <Surface variant="primary" className="py-20 text-center">
            <p className="text-white/55 italic">
              {activeTab === "CANDY_RECHARGE" ? "캔디 충전 내역은 준비 중입니다." : "내역이 존재하지 않습니다."}
            </p>
          </Surface>
        )}
      </div>
    </div>
  );
}
