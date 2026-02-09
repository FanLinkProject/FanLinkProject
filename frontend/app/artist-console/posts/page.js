"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_ARTISTS, MOCK_POSTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function ArtistPostsPage() {
  const [activeTab, setActiveTab] = useState("ARTIST");
  const artist = MOCK_ARTISTS[0];
  const currentPosts = MOCK_POSTS.filter(
    (p) =>
      p.artistId === artist.id &&
      (activeTab === "ARTIST" ? p.type === "ARTIST" : p.type === "FAN")
  );

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">게시물 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">그룹 콘텐츠 피드와 팬 게시판을 관리합니다.</p>
        </div>
        {activeTab === "ARTIST" && (
          <div className="flex gap-3">
            <button
              type="button"
              className="px-5 py-3 bg-white/[0.06] border border-white/[0.08] rounded-2xl font-bold text-xs flex items-center gap-3 text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              <img src={artist.members[0].avatar} className="size-5 rounded-full border border-white/[0.08]" alt="" />
              <span>작성자: {artist.members[0].name}</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            <Button variant="primary" href="/artist-console/posts/new" className="text-xs uppercase tracking-widest">
              새 글 작성
            </Button>
          </div>
        )}
      </header>

      <div className="flex gap-2 p-1 bg-white/[0.04] rounded-2xl w-fit border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setActiveTab("ARTIST")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "ARTIST" ? "bg-[#201a33] text-violet-300 border border-white/[0.08]" : "text-white/55 hover:text-white/80"
          }`}
        >
          아티스트 소식
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("FAN")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "FAN" ? "bg-[#201a33] text-violet-300 border border-white/[0.08]" : "text-white/55 hover:text-white/80"
          }`}
        >
          팬 커뮤니티
        </button>
      </div>

      <div className="space-y-4">
        {currentPosts.map((post) => (
          <Surface key={post.id} variant="primary" className="p-8 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <img src={post.authorAvatar} className="size-10 rounded-full border border-white/[0.08]" alt="" />
                <div>
                  <p className="font-bold text-white">{post.authorName}</p>
                  <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">{post.timestamp}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {post.type === "ARTIST" && (
                  <Button variant="ghost" href={`/artist-console/posts/${post.id}/edit`} className="px-4 py-2 text-[10px] uppercase tracking-widest">
                    수정
                  </Button>
                )}
                <button
                  type="button"
                  className="px-4 py-2 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
            <p className="text-white/80 leading-relaxed font-medium line-clamp-3">{post.content}</p>
          </Surface>
        ))}
      </div>
    </div>
  );
}
