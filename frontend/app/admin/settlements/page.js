"use client";

import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const settlements = [
  { id: 1, artistName: "아티스트_1", date: "2025.02.21", amount: "1,200,000원", status: "승인 대기" },
  { id: 2, artistName: "아티스트_2", date: "2025.02.20", amount: "980,000원", status: "승인 대기" },
];

export default function AdminSettlementsPage() {
  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">정산 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">아티스트 정산 요청을 검토하고 승인합니다.</p>
        </div>
        <Button variant="ghost" href="/admin" className="text-xs uppercase tracking-widest">
          대시보드
        </Button>
      </header>

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">아티스트</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">요청일</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">정산 금액</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상태</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">처리</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                <td className="px-8 py-6 font-bold text-white">{s.artistName}</td>
                <td className="px-8 py-6 text-sm text-white/70">{s.date}</td>
                <td className="px-8 py-6 font-black text-white tabular-nums">{s.amount}</td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-black uppercase tracking-widest">
                    {s.status}
                  </span>
                </td>
                <td className="px-8 py-6 flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-violet-500/20 text-violet-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-500/30 transition-colors"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
                  >
                    반려
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
