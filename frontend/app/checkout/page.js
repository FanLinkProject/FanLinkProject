"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function CheckoutPage() {
  const router = useRouter();
  const [method, setMethod] = useState("card");

  const handleComplete = () => {
    router.push("/mypage/history");
  };

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-12">
      <header className="flex items-center gap-4">
        <Link
          href="/cart"
          className="size-10 rounded-full border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-violet-300 transition-colors bg-white/[0.04]"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <SectionTitle className="text-2xl font-bold">굿즈 결제</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">
            현금 결제를 통해 상품 주문을 완료합니다.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <Surface variant="primary" className="p-8 space-y-6">
            <h3 className="font-black text-lg text-white">배송지 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="수령인"
                className="px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
                defaultValue="Alex Rivers"
              />
              <input
                placeholder="연락처"
                className="px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
                defaultValue="010-1234-5678"
              />
              <input
                placeholder="주소"
                className="col-span-full px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
                defaultValue="서울특별시 강남구 테헤란로 123"
              />
              <input
                placeholder="상세주소"
                className="col-span-full px-5 py-3.5 bg-[#201a33] border border-white/[0.06] rounded-2xl text-sm font-bold outline-none text-white placeholder:text-white/40 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </Surface>

          <Surface variant="primary" className="p-8 space-y-6">
            <h3 className="font-black text-lg text-white">결제 수단 선택</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["card", "kakao", "naver", "bank"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    method === m
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                      : "border-white/[0.06] text-white/55 hover:border-white/[0.1] hover:text-white/80"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {m === "card"
                      ? "credit_card"
                      : m === "bank"
                        ? "account_balance"
                        : "account_balance_wallet"}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{m}</span>
                </button>
              ))}
            </div>
          </Surface>
        </div>

        <div className="lg:col-span-4">
          <Surface variant="primary" className="p-8 sticky top-24">
            <h3 className="font-black text-lg text-white mb-6">최종 결제 금액</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm text-white/55">
                <span>총 상품 금액</span>
                <span>65,000원</span>
              </div>
              <div className="flex justify-between text-sm text-white/55">
                <span>배송비</span>
                <span>3,000원</span>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between font-black text-2xl text-violet-300">
                <span>합계</span>
                <span>68,000원</span>
              </div>
            </div>
            <Button
              variant="primary"
              className="w-full py-5 text-base uppercase tracking-widest"
              onClick={handleComplete}
            >
              결제하기
            </Button>
            <p className="text-[10px] text-center text-white/45 mt-4 leading-relaxed font-medium italic">
              현금 결제 완료 시 주문이 확정됩니다.
              <br />
              캔디로는 상품을 구매할 수 없습니다.
            </p>
          </Surface>
        </div>
      </div>
    </div>
  );
}
