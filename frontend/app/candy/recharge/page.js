"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CANDY_PACKAGES } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const CARD_PADDING = "p-6";
const CARD_MIN_HEIGHT = "min-h-[180px]";

export default function CandyRechargePage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(CANDY_PACKAGES[1].id);

  const handleRechargeClick = () => {
    const pkg = CANDY_PACKAGES.find((p) => p.id === selectedId);
    if (!pkg) return;
    if (
      confirm(
        `${pkg.price} 결제를 진행하시겠습니까?\n충전 후 ${pkg.amount.toLocaleString()} 캔디가 즉시 추가됩니다.`
      )
    ) {
      router.push("/mypage");
    }
  };

  const selectedPkg = CANDY_PACKAGES.find((p) => p.id === selectedId);

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
      <header className="flex items-center gap-4">
        <Link
          href="/mypage"
          className="size-10 rounded-full border border-white/10 flex items-center justify-center text-white/55 hover:text-violet-300 transition-colors bg-white/5"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <SectionTitle className="text-2xl font-bold">캔디 충전</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">
            멤버십 구독 및 유료 서비스 이용에 사용됩니다.
          </p>
        </div>
      </header>

      <Surface variant="primary" className="p-10 relative overflow-hidden">
        <span
          className="material-symbols-outlined absolute -right-10 -bottom-10 text-[200px] text-white/5 rotate-12 pointer-events-none"
          aria-hidden
        >
          token
        </span>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55 mb-2">
            My Balance
          </p>
          <h2 className="text-4xl font-black text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-violet-300 fill-icon text-4xl">
              token
            </span>
            보유 중인 캔디
          </h2>
          <p className="text-sm text-white/80 mt-6 font-medium leading-relaxed">
            충전된 캔디는 유효기간이 없으며,
            <br />
            언제든 좋아하는 아티스트를 응원하는 데 사용할 수 있습니다.
          </p>
        </div>
      </Surface>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {CANDY_PACKAGES.map((pkg) => {
          const isSelected = selectedId === pkg.id;
          const showPopular = pkg.id === "c2";
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setSelectedId(pkg.id)}
              className={[
                "rounded-2xl border-2 transition-all duration-200 relative overflow-hidden flex flex-col items-center justify-center text-center",
                CARD_PADDING,
                CARD_MIN_HEIGHT,
                isSelected
                  ? "border-violet-500 bg-violet-500/15 shadow-[0_0_14px_rgba(150,100,255,0.2)] ring-2 ring-violet-500/30 ring-inset"
                  : "border-white/[0.06] bg-[#201a33] hover:border-white/[0.1] hover:bg-white/[0.03] hover:shadow-[0_0_10px_rgba(150,100,255,0.1)]",
              ].join(" ")}
            >
              {/* 상단 우측 코너 배지 — 아이콘/수량/가격 영역과 분리 */}
              {showPopular && (
                <span
                  className="absolute top-3 right-3 bg-violet-500/90 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider leading-none"
                  aria-label="인기"
                >
                  Popular
                </span>
              )}

              {/* [ 아이콘 ] */}
              <div
                className={
                  isSelected
                    ? "size-12 rounded-2xl bg-violet-500 flex items-center justify-center text-white mb-5"
                    : "size-12 rounded-2xl bg-white/[0.06] flex items-center justify-center text-white/55 mb-5"
                }
              >
                <span className="material-symbols-outlined text-2xl">token</span>
              </div>

              {/* [ 캔디 수량 ] — 숫자+단위 한 블록 */}
              <p
                className="text-2xl font-black text-white leading-tight tabular-nums mb-1"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pkg.amount.toLocaleString()} 캔디
              </p>

              {/* [ 가격 ] — 보조 텍스트, 숫자+원 한 블록 */}
              <p
                className="text-sm font-bold text-white/70 tabular-nums leading-tight"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pkg.price}
              </p>
            </button>
          );
        })}
      </div>

      <Surface variant="primary" className="p-10">
        <h3 className="font-black text-lg text-white mb-8">결제 정보 확인</h3>
        <div className="space-y-4 mb-10">
          <div className="flex justify-between items-baseline gap-4">
            <span className="text-white/55 font-bold">충전 상품</span>
            <span className="text-white font-black tabular-nums shrink-0">
              {selectedPkg?.amount.toLocaleString()} 캔디
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-4">
            <span className="text-white/55 font-bold">결제 금액</span>
            <span className="text-violet-300 font-black text-xl tabular-nums shrink-0">
              {selectedPkg?.price}
            </span>
          </div>
          <div className="h-px bg-white/[0.06] mt-4" />
          <p className="text-[10px] text-white/45 leading-relaxed py-2">
            * 캔디 충전 시 부가세가 포함된 금액이 결제됩니다.
            <br />* 충전된 캔디는 현금으로 직접 환불되지 않으며, 서비스 내에서만 사용 가능합니다.
          </p>
        </div>
        <Button
          variant="primary"
          className="w-full py-5 text-base uppercase tracking-widest"
          onClick={handleRechargeClick}
        >
          결제 및 충전하기
        </Button>
      </Surface>
    </div>
  );
}
