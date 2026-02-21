"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");
  const orderId = searchParams.get("orderId");

  const displayMessage = message || "결제가 취소되었거나 실패했습니다.";
  const returnPath = searchParams.get("returnPath") || "/market";

  return (
    <div className="p-8 lg:p-12 max-w-2xl mx-auto text-center space-y-8">
      <div className="py-16">
        <span className="material-symbols-outlined text-8xl text-red-400/80 mb-6 block">error</span>
        <h1 className="text-4xl font-black text-white mb-4">결제 실패</h1>
        <p className="text-white/70 font-medium mt-2">{displayMessage}</p>
        {code && <p className="text-white/50 text-sm mt-2">코드: {code}</p>}
        {orderId && <p className="text-white/50 text-sm">주문 ID: {orderId}</p>}
      </div>
      <Link
        href={returnPath.startsWith("/") ? returnPath : "/market"}
        className="inline-flex items-center gap-2 py-5 px-10 bg-white/[0.08] border border-white/[0.12] text-white rounded-3xl font-black text-base hover:bg-white/[0.12] transition-all uppercase tracking-widest"
      >
        돌아가기
      </Link>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white/55">결제 정보를 불러오는 중...</div>}>
      <PaymentFailContent />
    </Suspense>
  );
}
