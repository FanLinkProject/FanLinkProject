"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_ARTISTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import SectionTitle from "@/components/ui/SectionTitle";

const COST_PER_ARTIST = 500;
const nextPaymentDate = "2026.03.01";

export default function MyPage() {
  const [profile, setProfile] = useState({
    name: "Alex Rivers",
    email: "alex@fanlink.io",
    phone: "010-1234-5678",
    password: "••••••••",
  });
  const [candyBalance] = useState(1500);

  const premiumArtists = MOCK_ARTISTS.filter((a) => a.isPremiumSubscribed);
  const generalArtists = MOCK_ARTISTS.filter(
    (a) => a.isSubscribed && !a.isPremiumSubscribed
  );
  const totalMonthlyExpected = premiumArtists.length * COST_PER_ARTIST;
  const isBalanceSufficient = candyBalance >= totalMonthlyExpected;

  function InputGroup({ label, value, onChange, disabled, type = "text" }) {
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-white/55 px-1">
          {label}
        </label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold border transition-all outline-none ${
            disabled
              ? "bg-white/[0.04] text-white/40 italic border-white/[0.04]"
              : "bg-[#201a33] text-white border-white/[0.06] focus:ring-2 focus:ring-violet-500/20"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <SectionTitle className="text-2xl font-bold">마이페이지</SectionTitle>

      <Surface variant="primary" className="p-8 lg:p-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="size-20 bg-white/[0.08] rounded-2xl flex items-center justify-center text-violet-300 border border-white/[0.06]">
              <span className="material-symbols-outlined text-4xl fill-icon">token</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55 mb-1">
                My Candy Balance
              </p>
              <h2 className="text-3xl font-black text-white">
                {candyBalance.toLocaleString()} 캔디
              </h2>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Button href="/candy/recharge" variant="primary" className="flex-1 md:flex-none px-8 py-4 text-xs uppercase tracking-widest">
              캔디 충전
            </Button>
            <Button href="/mypage/history" variant="ghost" className="flex-1 md:flex-none px-8 py-4 text-xs uppercase tracking-widest">
              내역 보기
            </Button>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/55 uppercase tracking-widest">
              결제 방식
            </p>
            <p className="text-sm font-bold text-white/80">매달 자동 결제</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/55 uppercase tracking-widest">
              다음 결제일
            </p>
            <p className="text-sm font-bold text-white/80">{nextPaymentDate}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/55 uppercase tracking-widest">
              월 예상 결제
            </p>
            <p className="text-sm font-bold text-white/80">
              {totalMonthlyExpected.toLocaleString()} 캔디
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-white/55 uppercase tracking-widest">
              결제 가능 여부
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold ${
                  isBalanceSufficient ? "text-emerald-400" : "text-red-400/90"
                }`}
              >
                {isBalanceSufficient ? "충분" : "잔액 부족"}
              </span>
              <span
                className={`size-2 rounded-full ${
                  isBalanceSufficient ? "bg-emerald-400" : "bg-red-400/90 animate-pulse"
                }`}
              />
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-7 space-y-8">
          <Surface variant="primary" className="p-10">
            <h3 className="text-lg font-semibold tracking-tight text-white mb-8">
              기본 정보 수정
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-6 mb-10">
                <img
                  src="https://picsum.photos/seed/alex/200/200"
                  className="size-24 rounded-2xl border-2 border-white/[0.08]"
                  alt=""
                />
                <Button variant="ghost" className="px-6 py-2.5 text-xs">
                  이미지 변경
                </Button>
              </div>
              <div className="space-y-4">
                <InputGroup
                  label="프로필 이름"
                  value={profile.name}
                  onChange={(v) => setProfile({ ...profile, name: v })}
                />
                <InputGroup label="이메일 주소" value={profile.email} disabled />
                <InputGroup
                  label="전화번호"
                  value={profile.phone}
                  onChange={(v) => setProfile({ ...profile, phone: v })}
                />
              </div>
              <div className="pt-6">
                <Button variant="primary" className="w-full py-4">
                  저장하기
                </Button>
              </div>
            </div>
          </Surface>
        </section>

        <aside className="lg:col-span-5 space-y-8">
          <Surface variant="primary" className="p-8 lg:p-10 flex flex-col gap-10">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">
                    멤버십 구독
                  </h3>
                  <p className="text-[11px] text-white/55 font-medium">매달 캔디로 정기 결제</p>
                </div>
                <Link
                  href="/mypage/history"
                  className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                >
                  전체보기
                </Link>
              </div>
              <div className="space-y-4">
                {premiumArtists.map((a) => (
                  <Link
                    key={a.id}
                    href={`/artists/${a.id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all group"
                  >
                    <img
                      src={a.avatar}
                      className="size-14 rounded-2xl border border-white/[0.08]"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                          {a.name}
                        </p>
                        <span className="bg-violet-500/20 text-violet-300 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">
                          MEMBERSHIP
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] text-white/55 font-medium">
                          월: {COST_PER_ARTIST.toLocaleString()} 캔디
                        </p>
                        <p className="text-[10px] text-white/45 font-medium italic">
                          다음 결제: {nextPaymentDate}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 uppercase shrink-0">
                      정상
                    </span>
                  </Link>
                ))}
                {premiumArtists.length === 0 && (
                  <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                    <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">
                      구독 중인 유료 멤버십이 없습니다.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-6">
                <h3 className="text-lg font-black tracking-tight text-white">구독 중</h3>
                <p className="text-[11px] text-white/55 font-medium">콘텐츠 소식 받기</p>
              </div>
              <div className="space-y-3">
                {generalArtists.map((a) => (
                  <Link
                    key={a.id}
                    href={`/artists/${a.id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/[0.06]"
                  >
                    <img
                      src={a.avatar}
                      className="size-11 rounded-2xl border border-white/[0.08]"
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                        {a.name}
                      </p>
                      <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                        {a.memberCount} Fans
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-white/45 group-hover:text-violet-300 transition-colors">
                      chevron_right
                    </span>
                  </Link>
                ))}
                {generalArtists.length === 0 && (
                  <div className="p-6 text-center border border-dashed border-white/[0.08] rounded-2xl">
                    <p className="text-[11px] text-white/55 font-medium leading-relaxed italic">
                      팔로우 중인 아티스트가 없습니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Surface>
        </aside>
      </div>
    </div>
  );
}
