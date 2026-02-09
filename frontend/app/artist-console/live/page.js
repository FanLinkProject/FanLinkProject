"use client";

import Link from "next/link";
import { MOCK_LIVES } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function ArtistLivePage() {
  const lives = MOCK_LIVES;

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">라이브 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">라이브 스트리밍 일정을 관리하고 다시보기를 발행하세요.</p>
        </div>
        <Link
          href="/artist-console/live"
          className="px-6 py-3 bg-red-500/90 text-white rounded-full font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
        >
          라이브 시작하기
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {lives.map((live) => (
          <Surface key={live.id} variant="card" className="overflow-hidden">
            <div className="aspect-video relative overflow-hidden bg-white/5">
              <img src={live.thumbnail} className="w-full h-full object-cover" alt="" />
              <div className="absolute top-3 left-3">
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    live.status === "LIVE"
                      ? "bg-red-500/90 text-white"
                      : live.status === "UPCOMING"
                        ? "bg-white/20 text-white"
                        : "bg-white/10 text-white/90"
                  }`}
                >
                  {live.status}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h4 className="font-bold text-white truncate mb-2">{live.title}</h4>
              <p className="text-[10px] text-white/55 font-black uppercase tracking-widest mb-4">{live.startTime}</p>
              <div className="flex gap-2">
                <Link
                  href={`/live/${live.id}`}
                  className="flex-1 py-3 bg-[#201a33] border border-white/[0.08] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/[0.06] transition-colors text-center"
                >
                  {live.status === "ENDED" ? "다시보기" : "시청하기"}
                </Link>
                <Button variant="ghost" className="flex-1 py-3 text-[10px] uppercase tracking-widest">
                  설정
                </Button>
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
