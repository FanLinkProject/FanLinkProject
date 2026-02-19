"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_ARTISTS, MOCK_POSTS, MOCK_LIVES } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import PostFeed from "@/components/PostFeed";

export default function ArtistConsolePage() {
  const [activeTab, setActiveTab] = useState("POSTS");
  const me = MOCK_ARTISTS[0];
  const myPosts = MOCK_POSTS.filter((p) => p.artistId === me.id && p.type === "ARTIST");
  const fanPosts = MOCK_POSTS.filter((p) => p.artistId === me.id && p.type === "FAN");
  const endedLives = MOCK_LIVES.filter((l) => l.status === "ENDED");

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-10">
      <Surface variant="primary" className="p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <img
          src={me.avatar}
          className="size-32 rounded-2xl border-2 border-white/[0.08] shrink-0"
          alt=""
        />
        <div className="flex-1 text-center md:text-left">
          <SectionTitle className="text-3xl font-black">{me.name} Studio</SectionTitle>
          <p className="text-white/70 font-medium mt-2">팬들과 가장 가깝게 만나는 나만의 공간입니다.</p>
          <div className="flex flex-wrap items-center gap-4 mt-6 justify-center md:justify-start">
            <span className="inline-flex items-center justify-center leading-none px-4 py-1.5 bg-white/[0.06] rounded-full border border-white/[0.06] text-[10px] font-black text-white/55 uppercase tracking-widest">
              팔로워
            </span>
            <span className="inline-flex items-center leading-none text-xs font-black text-violet-300">{me.memberCount}</span>
            <span className="inline-flex items-center justify-center leading-none px-4 py-1.5 bg-white/[0.06] rounded-full border border-white/[0.06] text-[10px] font-black text-white/55 uppercase tracking-widest">
              게시물
            </span>
            <span className="inline-flex items-center leading-none text-xs font-black text-violet-300">{me.postCount}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-3">
          <Button variant="primary" href="/artist-console/group-dm" className="text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm fill-icon mr-1.5">send</span>
            DM
          </Button>
        </div>
      </Surface>

      <div className="flex items-center gap-2 p-1 bg-white/[0.04] rounded-2xl w-fit border border-white/[0.06]">
        {[
          { id: "POSTS", label: "My Posts" },
          { id: "FAN_POSTS", label: "Fan Posts" },
          { id: "LIVE", label: "Live History" },
          { id: "CONCERTS", label: "Concerts", href: "/artist-console/concerts" },
        ].map((tab) =>
          tab.href ? (
            <Link
              key={tab.id}
              href={tab.href}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-[#201a33] text-violet-300 border border-white/[0.08]"
                  : "text-white/55 hover:text-white/80"
              }`}
            >
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-[#201a33] text-violet-300 border border-white/[0.08]"
                  : "text-white/55 hover:text-white/80"
              }`}
            >
              {tab.label}
            </button>
          )
        )}
      </div>

      <div className="space-y-6">
        {activeTab === "POSTS" && (
          <PostFeed posts={myPosts} postLinkBase="/posts" postLinkQuery="from=artist-console" showVerifiedByType={true} />
        )}

        {activeTab === "FAN_POSTS" && (
          <PostFeed posts={fanPosts} postLinkBase="/posts" postLinkQuery="from=artist-console" showVerifiedByType={true} />
        )}

        {activeTab === "LIVE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {endedLives.map((live) => (
              <Surface key={live.id} variant="card" className="overflow-hidden">
                <div className="aspect-video relative overflow-hidden bg-white/5">
                  <img src={live.thumbnail} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="p-6">
                  <h4 className="font-bold text-white truncate mb-4">{live.title}</h4>
                  <Button variant="primary" className="w-full py-3 text-[10px] uppercase tracking-widest">
                    다시보기 발행
                  </Button>
                </div>
              </Surface>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
