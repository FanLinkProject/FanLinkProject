"use client";

import Link from "next/link";
import { MOCK_ARTISTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function AdminArtistsPage() {
  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">아티스트 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">등록된 아티스트 및 그룹을 검토하고 승인합니다.</p>
        </div>
        <Button variant="ghost" href="/admin" className="text-xs uppercase tracking-widest">
          대시보드
        </Button>
      </header>

      <div className="space-y-4">
        {MOCK_ARTISTS.map((artist) => (
          <Surface
            key={artist.id}
            variant="primary"
            className="p-8 flex items-center gap-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow"
          >
            <img src={artist.avatar} className="size-16 rounded-2xl border border-white/[0.08]" alt="" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-white">{artist.name}</h3>
              <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mt-1">
                {artist.memberCount} Fans • {artist.postCount} Posts
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              승인됨
            </span>
            <Button variant="ghost" className="px-4 py-2 text-[10px] uppercase tracking-widest">
              상세
            </Button>
          </Surface>
        ))}
      </div>
    </div>
  );
}
