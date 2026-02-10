"use client";

import Link from "next/link";
import { MOCK_ARTISTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function ArtistMembersPage() {
  const artist = MOCK_ARTISTS[0];

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">Members Management</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">그룹에 소속된 멤버들을 관리하고 권한을 부여하세요.</p>
        </div>
        <Button variant="primary" href="/artist-console/dashboard" className="text-xs uppercase tracking-widest">
          멤버 초대하기
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {artist.members.map((member) => (
          <Surface key={member.id} variant="primary" className="p-8 flex flex-col items-center text-center">
            <div className="relative mb-6">
              <img src={member.avatar} className="size-24 rounded-2xl border-2 border-white/[0.08]" alt="" />
              <span className="absolute bottom-1 right-1 size-5 bg-emerald-400 border-2 border-[#201a33] rounded-full" />
            </div>
            <h3 className="text-xl font-black text-white mb-1">{member.name}</h3>
            <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest mb-6">Official Member</p>
            <div className="w-full p-4 bg-white/[0.04] rounded-2xl mb-8 space-y-2 border border-white/[0.06]">
              <p className="text-[10px] font-black text-white/55 uppercase tracking-widest">부여된 권한</p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 bg-white/[0.06] rounded-lg text-[9px] font-bold text-white/80 border border-white/[0.06]">
                  게시물 작성
                </span>
                <span className="px-2 py-1 bg-white/[0.06] rounded-lg text-[9px] font-bold text-white/80 border border-white/[0.06]">
                  1:1 DM 소통
                </span>
                <span className="px-2 py-1 bg-white/[0.06] rounded-lg text-[9px] font-bold text-white/80 border border-white/[0.06]">
                  라이브 호스트
                </span>
              </div>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="ghost" className="flex-1 py-3 text-[10px] uppercase tracking-widest">
                설정
              </Button>
              <button
                type="button"
                className="flex-1 py-3 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
              >
                권한 해제
              </button>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
