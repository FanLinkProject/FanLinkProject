"use client";

import Link from "next/link";
import { MOCK_ARTISTS } from "@/lib/mockData";

export default function FanSidebar() {
  const followingArtists = MOCK_ARTISTS.filter((a) => a.isSubscribed);
  const dmArtists = MOCK_ARTISTS.filter((a) => a.isPremiumSubscribed);

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-[#16102a] backdrop-blur-sm border-r border-white/[0.05] hidden lg:flex flex-col p-6 z-40 overflow-y-auto no-scrollbar">
      <div className="flex flex-col gap-8">
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              팔로잉 아티스트
            </h3>
            <span className="inline-flex items-center leading-none text-[10px] font-medium text-white/55">
              {followingArtists.length}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {followingArtists.map((a) => (
              <Link
                key={a.id}
                href={`/artists/${a.id}`}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-all text-left group">
                <img
                  src={a.avatar}
                  className="size-9 rounded-full border border-white/10 group-hover:border-violet-400/30 shadow-sm"
                  alt=""
                />
                <span className="text-[13px] font-medium text-white/80 truncate group-hover:text-violet-300 transition-colors leading-tight">
                  {a.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="inline-flex items-center leading-none text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
              DM
            </h3>
          </div>
          <div className="flex flex-col gap-1">
            {dmArtists.map((a) => (
              <Link
                key={`dm-${a.id}`}
                href="/dm"
                className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/10 transition-all text-left group">
                <img
                  src={a.avatar}
                  className="size-10 rounded-2xl border border-white/10 group-hover:border-violet-400/30 shadow-sm"
                  alt=""
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors leading-tight">
                    {a.name}
                  </p>
                  <p className="text-[10px] text-white/55 font-normal uppercase tracking-wider truncate leading-tight">
                    최근 대화 보기
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
