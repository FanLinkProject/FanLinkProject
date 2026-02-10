"use client";

import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const orders = [
  {
    id: "ORD-12345",
    name: "Signature Hoodie - Violet",
    status: "배송 중",
    tracking: "한진택배 1234567890",
    address: "서울특별시 강남구 테헤란로 123",
  },
  {
    id: "ORD-12344",
    name: "Signed Vinyl - Moonlit Night",
    status: "배송 완료",
    tracking: "우체국택배 9876543210",
    address: "서울특별시 강남구 테헤란로 123",
  },
];

export default function ShippingInfoPage() {
  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <SectionTitle className="text-2xl font-bold">배송 정보</SectionTitle>
        <Link
          href="/mypage"
          className="size-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.1] transition-all"
        >
          <span className="material-symbols-outlined">close</span>
        </Link>
      </header>

      <Surface variant="primary" className="p-10">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-white">기본 배송지</h3>
          <button
            type="button"
            className="text-xs font-bold text-violet-300 hover:underline"
          >
            변경
          </button>
        </div>
        <div className="space-y-2">
          <p className="font-bold text-white">Alex Rivers (010-1234-5678)</p>
          <p className="text-white/70 font-medium">
            서울특별시 강남구 테헤란로 123, FanLink 빌딩 7층
          </p>
          <p className="text-xs text-white/45 font-medium italic mt-2">
            &quot;부재 시 문 앞에 놓아주세요.&quot;
          </p>
        </div>
      </Surface>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white px-2">주문별 배송 상태</h3>
        <div className="space-y-4">
          {orders.map((order) => (
            <Surface key={order.id} variant="primary" className="p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest">
                  #{order.id}
                </span>
                <span
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    order.status === "배송 중"
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{order.name}</h4>
              <div className="space-y-1">
                <p className="text-sm text-white/70 font-medium">
                  <span className="text-white/55 mr-2">운송장:</span> {order.tracking}
                </p>
                <p className="text-sm text-white/70 font-medium">
                  <span className="text-white/55 mr-2">배송지:</span> {order.address}
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="primary" className="flex-1 py-3 text-[11px] uppercase tracking-widest">
                  배송 추적
                </Button>
                <Button variant="ghost" className="flex-1 py-3 text-[11px] uppercase tracking-widest">
                  구매 확정
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}
