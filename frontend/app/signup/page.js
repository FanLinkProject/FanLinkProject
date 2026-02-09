"use client";

import Link from "next/link";

function SelectionCard({ title, description, icon, href, accentColor }) {
  return (
    <Link
      href={href}
      className="bg-[#201a33] rounded-[3rem] p-10 border border-white/[0.08] hover:border-violet-500/30 hover:shadow-[0_0_24px_rgba(139,92,246,0.12)] transition-all text-left group flex flex-col h-full"
    >
      <div className={`size-16 ${accentColor} rounded-[1.8rem] flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform`}>
        <span className="material-symbols-outlined text-3xl font-light">{icon}</span>
      </div>
      <h3 className="text-2xl font-black text-white mb-4 tracking-tight">{title}</h3>
      <p className="text-white/70 font-medium leading-relaxed mb-8 flex-1">{description}</p>
      <div className="flex items-center gap-2 text-violet-300 font-black text-sm uppercase tracking-widest">
        시작하기 <span className="material-symbols-outlined">arrow_forward</span>
      </div>
    </Link>
  );
}

export default function SignupSelectPage() {
  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-[#0b0814]">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight">반가워요! 어떻게 가입하시겠어요?</h1>
          <p className="text-white/65 font-medium">FanLink에서 아티스트와 팬의 특별한 인연을 시작하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <SelectionCard
            title="아티스트로 가입"
            description="작품을 공유하고 팬들과 소통하며 공식 채널을 운영해보세요."
            icon="brush"
            href="/signup/artist"
            accentColor="bg-violet-500/90"
          />
          <SelectionCard
            title="팬으로 가입"
            description="좋아하는 아티스트를 구독하고 라이브와 DM으로 응원을 보내보세요."
            icon="favorite"
            href="/signup/fan"
            accentColor="bg-[#16102a]"
          />
        </div>

        <div className="mt-12 text-center">
          <Link href="/login" className="text-sm font-bold text-white/55 hover:text-violet-300 transition-colors">
            이미 계정이 있나요? 로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}
