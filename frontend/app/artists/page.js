"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_ARTISTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";

export default function ArtistsListPage() {
  const [search, setSearch] = useState("");
  const filteredArtists = MOCK_ARTISTS.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-4">
            Explore Artists
          </h1>
          <p className="text-white/80 font-medium leading-relaxed italic">
            새로운 영감을 주는 아티스트들을 발견하고 그들의 여정에 함께하세요.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/55">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="아티스트 검색..."
            className="w-full bg-[#201a33] border border-white/[0.06] rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-white/10 focus:border-white/[0.1] transition-all font-bold text-sm text-white placeholder:text-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredArtists.map((artist) => (
          <Link
            key={artist.id}
            href={`/artists/${artist.id}`}
            className="group flex flex-col"
          >
            <Surface
              variant="card"
              className="p-8 flex flex-col items-center text-center h-full overflow-hidden"
            >
              <div className="relative mb-6">
                <img
                  src={artist.avatar}
                  className="size-28 rounded-2xl border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.35)] group-hover:scale-[1.02] transition-transform duration-200 ease-out"
                  alt={artist.name}
                />
                {artist.isLive && (
                  <span className="absolute -bottom-1 -right-1 size-6 bg-red-500 rounded-full border-2 border-[#201a33] animate-pulse" />
                )}
              </div>
              <h3 className="text-2xl font-black text-white mb-4">
                {artist.name}
              </h3>
              <p className="text-sm text-white/80 leading-relaxed font-medium line-clamp-3 mb-8">
                {artist.description}
              </p>
              <div className="flex gap-4 w-full pt-6 border-t border-white/10">
                <div className="flex-1 text-center">
                  <p className="text-xs font-black text-white">
                    {artist.memberCount}
                  </p>
                  <p className="text-[9px] font-bold text-white/55 uppercase tracking-widest mt-1">
                    Fans
                  </p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xs font-black text-white">
                    {artist.postCount}
                  </p>
                  <p className="text-[9px] font-bold text-white/55 uppercase tracking-widest mt-1">
                    Posts
                  </p>
                </div>
              </div>
            </Surface>
          </Link>
        ))}
      </div>
    </div>
  );
}
