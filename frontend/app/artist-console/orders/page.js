"use client";

import { useEffect, useState } from "react";
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

export default function ArtistOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      setLoading(false);
      return;
    }
    axios
      .get(`${BASE_URL}/api/artist/orders`, { headers, params: { size: 50 } })
      .then((res) => {
        const content = res.data?.content ?? [];
        setOrders(Array.isArray(content) ? content : []);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

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
            {loading ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-white/55 text-sm">
                  로딩 중…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-white/55 text-sm">
                  주문 내역이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.orderNo} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-bold text-white">#{order.orderNo}</p>
                    <p className="text-[10px] text-white/55">{order.date}</p>
                  </td>
                  <td className="px-8 py-6 font-medium text-white/80">{order.productName}</td>
                  <td className="px-8 py-6 font-black text-white tabular-nums">{formatKRW(order.totalAmount)}</td>
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
              ))
            )}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}
