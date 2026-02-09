"use client";

import { useState } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";

const historyData = {
  CANDY_RECHARGE: [
    {
      id: "CHG-102",
      date: "2025.02.21",
      name: "3,000 캔디 충전",
      amount: "33,000원",
      status: "충전 완료",
    },
    {
      id: "CHG-101",
      date: "2025.01.10",
      name: "1,000 캔디 충전",
      amount: "11,000원",
      status: "충전 완료",
    },
  ],
  MEMBERSHIP_USE: [
    {
      id: "SUB-201",
      date: "2025.02.21",
      name: "Luna Ray Membership (1단계)",
      amount: "-500 캔디",
      status: "구독 완료",
    },
  ],
  GOODS_BUY: [
    {
      id: "ORD-12345",
      date: "2025.02.20",
      name: "Signature Hoodie - Violet",
      amount: "68,000원",
      status: "배송 준비중",
    },
    {
      id: "ORD-12344",
      date: "2025.01.15",
      name: "Signed Vinyl - Moonlit Night",
      amount: "45,000원",
      status: "배송 완료",
    },
  ],
};

const TABS = [
  { id: "CANDY_RECHARGE", label: "캔디 충전" },
  { id: "MEMBERSHIP_USE", label: "멤버십 사용" },
  { id: "GOODS_BUY", label: "상품 구매" },
];

export default function PaymentHistoryPage() {
  const [activeTab, setActiveTab] = useState("CANDY_RECHARGE");
  const currentHistory = historyData[activeTab];

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
            <p className="text-white/55 italic">내역이 존재하지 않습니다.</p>
          </Surface>
        )}
      </div>
    </div>
  );
}
