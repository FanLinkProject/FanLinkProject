"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MOCK_POSTS, MOCK_ARTISTS } from "@/lib/mockData";

function PostDetailContent({ id }) {
  const searchParams = useSearchParams();
  const fromArtistConsole = searchParams.get("from") === "artist-console";

  const [post, setPost] = useState(null);
  const [artist, setArtist] = useState(null);

  useEffect(() => {
    const p = MOCK_POSTS.find((x) => x.id === id);
    setPost(p || MOCK_POSTS[0]);
    if (p) {
      const a = MOCK_ARTISTS.find((x) => x.id === p.artistId);
      setArtist(a || MOCK_ARTISTS[0]);
    }
  }, [id]);

  if (!post || !artist) return null;

  return (
    <div className="max-w-6xl mx-auto p-8 flex flex-col lg:flex-row gap-8 min-h-full">
      <div className="flex-1 space-y-6">
        <Link
          href={fromArtistConsole ? "/artist-console" : `/artists/${artist.id}`}
          className="flex items-center gap-2 text-white/55 hover:text-violet-300 font-bold text-xs uppercase tracking-widest transition-all mb-4"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {fromArtistConsole ? "아티스트 콘솔로 돌아가기" : "아티스트 페이지로 돌아가기"}
        </Link>

        <article className="bg-[#201a33] rounded-[2.5rem] border border-white/[0.08] overflow-hidden">
          {post.image && (
            <div className="w-full aspect-video overflow-hidden">
              <img src={post.image} className="w-full h-full object-cover" alt="" />
            </div>
          )}
          <div className="p-10">
            <div className="flex items-center gap-4 mb-8">
              <img src={post.authorAvatar} className="size-14 rounded-2xl border-2 border-white/[0.1] object-cover" alt="" />
              <div>
                <h4 className="text-lg font-extrabold text-white">{post.authorName}</h4>
                <p className="text-xs text-white/55 font-semibold uppercase tracking-wider">{post.timestamp} • 공식 업데이트</p>
              </div>
            </div>
            <div className="prose max-w-none">
              <p className="text-white/85 text-xl leading-relaxed font-light italic">&quot;{post.content}&quot;</p>
            </div>
          </div>
        </article>
      </div>

      <aside className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        <div className="bg-[#201a33] rounded-3xl border border-white/[0.08] flex flex-col h-[calc(100vh-160px)] sticky top-24">
          <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-extrabold text-white">댓글 및 토론</h3>
            <span className="text-xs font-bold text-white/55 uppercase tracking-widest">{post.comments}개</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <img src={`https://picsum.photos/seed/${i + 100}/100/100`} className="size-9 rounded-full bg-white/[0.08] shrink-0 border border-white/[0.06]" alt="" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">팬_{i}</span>
                    <span className="text-[10px] font-bold text-white/55 uppercase">2시간 전</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">작업물이 너무 기대됩니다! 항상 응원해요 ✨</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-white/[0.02] border-t border-white/[0.06]">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="따뜻한 댓글을 남겨주세요..."
                className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 outline-none"
              />
              <button type="button" className="size-10 bg-violet-500/90 text-white rounded-xl flex items-center justify-center hover:brightness-110 transition-all">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function PostDetailPage({ params }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams?.id;
  return (
    <Suspense fallback={<div className="p-8 text-white/55">로딩 중...</div>}>
      <PostDetailContent id={id} />
    </Suspense>
  );
}
