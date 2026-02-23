"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { request } from "@/lib/api";
import { getDefaultAvatarUrl } from "@/lib/avatar";

const CANDY_COST = 500;

function BenefitItem({ icon, text }) {
  return (
    <li className="flex items-center gap-3">
      <div className="size-6 bg-violet-500/20 rounded-lg flex items-center justify-center text-violet-300">
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
      </div>
      <span className="text-xs font-bold text-white/80">{text}</span>
    </li>
  );
}

function CandyPaymentClient() {
  const searchParams = useSearchParams();
  const artistId = searchParams.get("artistId");
  const [artist, setArtist] = useState(null);
  const [candyBalance, setCandyBalance] = useState(0);

  useEffect(() => {
    if (!artistId) return;
    request(`/api/user/artists/${artistId}/dashboard`)
      .then((data) => {
        const info = data?.artistInfo;
        setArtist(info ? { id: artistId, nickname: info.nickname, name: info.nickname, profileImageUrl: info.profileImageUrl } : null);
      })
      .catch(() => setArtist(null));
    request("/api/user/profile").then((p) => setCandyBalance(Number(p?.candy ?? 0))).catch(() => setCandyBalance(0));
  }, [artistId]);
  const isBalanceSufficient = candyBalance >= CANDY_COST;
  const expectedBalance = candyBalance - CANDY_COST;
  const displayName = artist?.nickname ?? artist?.name ?? "아티스트";

  const handlePayment = () => {
    if (!isBalanceSufficient || !artistId) return;
    alert(
      `${displayName} 공식 멤버십 구독이 완료되었습니다!\n${CANDY_COST} 캔디가 차감되었습니다.`,
    );
    window.location.href = `/artists/${artistId}`;
  };

  if (artistId && artist === null && candyBalance === 0) {
    return (
      <div className="p-8 lg:p-12 max-w-4xl mx-auto">
        <p className="text-white/55">불러오는 중...</p>
      </div>
    );
  }

  if (!artistId) {
    return (
      <div className="p-8 lg:p-12 max-w-4xl mx-auto">
        <p className="text-white/55">아티스트 정보가 없습니다.</p>
        <Link href="/artists" className="text-violet-300 text-sm mt-2 inline-block">아티스트 목록으로</Link>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
      <header className="flex items-center gap-4">
        <Link
          href={`/artists/${artistId}`}
          className="size-10 rounded-full border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-violet-300 transition-colors bg-white/[0.04]"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <SectionTitle className="text-2xl font-bold">멤버십 구독 확인</SectionTitle>
          <p className="text-white/55 text-sm font-medium mt-1">
            보유한 캔디를 사용하여 아티스트를 정기 후원합니다.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:items-stretch">
        <Surface variant="primary" className="p-10 flex flex-col h-full min-h-0 gap-8">
          <div className="flex items-center gap-5 shrink-0">
            <img
              src={artist?.profileImageUrl || getDefaultAvatarUrl(displayName)}
              className="size-20 rounded-2xl border-2 border-white/[0.08] object-cover"
              alt=""
            />
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                {displayName}
              </h3>
              <span className="text-violet-300 text-[10px] font-black uppercase tracking-widest">
                Official Artist
              </span>
            </div>
          </div>

          <div className="h-px bg-white/[0.06] shrink-0" />

          <div className="space-y-6 flex-1 min-h-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55 mb-2">
                구독 상품
              </p>
              <h4 className="text-xl font-black text-white">
                공식 멤버십 (1단계)
              </h4>
              <p className="text-white/55 text-sm font-medium mt-1">
                월 정기 구독 서비스
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55 mb-3">
                주요 혜택
              </p>
              <ul className="space-y-3">
                <BenefitItem
                  icon="diversity_1"
                  text="멤버십 전용 포스트 열람"
                />
                <BenefitItem icon="mail" text="아티스트와 1:1 DM 가능" />
                <BenefitItem icon="star" text="라이브 채팅 내 전용 배지" />
              </ul>
            </div>
          </div>
        </Surface>

        <section className="flex flex-col min-h-0">
          <Surface variant="primary" className="p-10 flex flex-col h-full min-h-0 gap-8">
            <h3 className="text-xl font-black text-white shrink-0">결제 정보</h3>

            <div className="space-y-5 flex-1 min-h-0">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white/55">
                  멤버십 가격
                </span>
                <span className="text-lg font-black text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-violet-300 fill-icon">
                    token
                  </span>
                  {CANDY_COST} 캔디
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white/55">
                  현재 보유 캔디
                </span>
                <span className="text-sm font-black text-white/80">
                  {candyBalance.toLocaleString()} 캔디
                </span>
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-white">
                  결제 후 잔액
                </span>
                <span
                  className={`text-xl font-black ${
                    isBalanceSufficient ? "text-violet-300" : "text-red-400/90"
                  }`}
                >
                  {isBalanceSufficient
                    ? `${expectedBalance.toLocaleString()} 캔디`
                    : "잔액 부족"}
                </span>
              </div>
            </div>

            {isBalanceSufficient ? (
              <div className="space-y-4 shrink-0">
                <Button
                  variant="primary"
                  className="w-full py-5 text-base uppercase tracking-widest"
                  onClick={handlePayment}
                >
                  캔디로 결제하기
                </Button>
                <p className="text-[10px] text-center text-white/45 leading-relaxed font-medium">
                  &apos;캔디로 결제하기&apos; 클릭 시 즉시 캔디가 차감되며,
                  <br />
                  멤버십 혜택이 적용됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4 shrink-0">
                <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400/90 text-lg">
                    error
                  </span>
                  <p className="text-xs font-bold text-red-400/90">
                    캔디 잔액이 부족합니다.
                  </p>
                </div>
                <Button
                  href="/candy/recharge"
                  variant="primary"
                  className="w-full py-5 text-base uppercase tracking-widest"
                >
                  캔디 충전하러 가기
                </Button>
              </div>
            )}
          </Surface>
        </section>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-white/55">Loading...</div>}>
      <CandyPaymentClient />
    </Suspense>
  );
}
