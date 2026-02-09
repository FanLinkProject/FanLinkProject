"use client";

import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const orders = [
  { id: "ORD-12345", date: "2025.02.20", product: "Signature Hoodie - Violet", amount: "68,000원", status: "배송준비" },
  { id: "ORD-12344", date: "2025.02.18", product: "Signed Vinyl", amount: "45,000원", status: "배송중" },
];

export default function ArtistOrdersPage() {
  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">주문 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">굿즈 주문 내역을 확인하고 배송을 관리하세요.</p>
        </div>
        <Button variant="primary" href="/artist-console/dashboard" className="text-xs uppercase tracking-widest">
          대시보드
        </Button>
      </header>

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">주문번호 / 일자</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상품명</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">금액</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상태</th>
              <th className="px-8 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">관리</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                <td className="px-8 py-6">
                  <p className="font-bold text-white">#{order.id}</p>
                  <p className="text-[10px] text-white/55">{order.date}</p>
                </td>
                <td className="px-8 py-6 font-medium text-white/80">{order.product}</td>
                <td className="px-8 py-6 font-black text-white tabular-nums">{order.amount}</td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-300">
                    {order.status}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <button type="button" className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline">
                    송장 입력
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
