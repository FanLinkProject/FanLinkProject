"use client";

import Link from "next/link";
import { MOCK_SETTLEMENTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

function StatCard({ label, value, color }) {
  return (
    <Surface variant="primary" className="p-6">
      <p className="text-[9px] font-black text-white/55 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
    </Surface>
  );
}

export default function ArtistSettlementPage() {
  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">정산 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">누적 수익 현황과 정산 내역을 확인하세요.</p>
        </div>
        <Button variant="primary" className="px-8 py-4 text-xs uppercase tracking-widest">
          정산 신청하기
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="정산 가능 금액" value="1,120,000원" color="text-violet-300" />
        <StatCard label="정산 대기 금액" value="450,000원" color="text-white/70" />
        <StatCard label="누적 정산액" value="12,500,000원" color="text-white" />
        <StatCard label="이번 달 수익(캔디)" value="5,500 캔디" color="text-violet-300" />
      </div>

      <Surface variant="primary" className="overflow-hidden">
        <div className="p-8 border-b border-white/[0.06] flex justify-between items-center">
          <h3 className="text-lg font-black text-white">정산 내역</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">날짜 / 구분</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">정산 금액</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상태</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상세</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SETTLEMENTS.map((s) => (
              <tr key={s.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                <td className="px-8 py-6">
                  <div>
                    <p className="font-bold text-white">{s.date}</p>
                    <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                      {s.type === "GOODS" ? "굿즈 판매 수익" : "멤버십 구독 수익"}
                    </p>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="font-black text-white tabular-nums">{s.amount}</span>
                </td>
                <td className="px-8 py-6">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      s.status === "완료" ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-300"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <button type="button" className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline">
                    보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}
