"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MOCK_ARTISTS, MOCK_POSTS, MOCK_LIVES } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import Button from "@/components/ui/Button";
import PostFeed from "@/components/PostFeed";

const CANDY_COST = 500;

export default function ArtistDetailPage({ params }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams?.id;

  const router = useRouter();
  const [artist, setArtist] = useState(null);
  const [activeTab, setActiveTab] = useState("ARTIST");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImagePreview, setNewPostImagePreview] = useState(null);
  const [newPostImageFile, setNewPostImageFile] = useState(null);
  const fanPostFileInputRef = useRef(null);
  const [candyBalance] = useState(1500);
  const [localFanPosts, setLocalFanPosts] = useState([]);
  const [likedPostIds, setLikedPostIds] = useState(() => new Set());

  useEffect(() => {
    const a = MOCK_ARTISTS.find((x) => x.id === id);
    setArtist(a || MOCK_ARTISTS[0]);
    setLocalFanPosts(MOCK_POSTS.filter((p) => p.artistId === (a?.id || id) && p.type === "FAN"));
  }, [id]);

  if (!artist) return null;

  const artistPosts = MOCK_POSTS.filter((p) => p.artistId === artist.id && p.type === "ARTIST");
  const artistNotices = MOCK_POSTS.filter((p) => p.artistId === artist.id && p.type === "NOTICE");

  const handleTabClick = (tabId) => {
    if (tabId === "MARKET") {
      router.push(`/artists/${artist.id}/market`);
      return;
    }
    setActiveTab(tabId);
  };

  const handleFanPostImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setNewPostImageFile(file);
    setNewPostImagePreview(URL.createObjectURL(file));
  };

  const removeFanPostImage = () => {
    if (newPostImagePreview && newPostImageFile) URL.revokeObjectURL(newPostImagePreview);
    setNewPostImageFile(null);
    setNewPostImagePreview(null);
    if (fanPostFileInputRef.current) fanPostFileInputRef.current.value = "";
  };

  const handleLike = (postId) => {
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    const newPost = {
      id: `p-new-${Date.now()}`,
      artistId: artist.id,
      authorName: "Alex Rivers",
      authorAvatar: "https://picsum.photos/seed/alex/100/100",
      content: newPostContent,
      image: newPostImagePreview || null,
      likes: "0",
      comments: 0,
      timestamp: "방금 전",
      type: "FAN",
    };
    setLocalFanPosts([newPost, ...localFanPosts]);
    setNewPostContent("");
    if (newPostImagePreview && newPostImageFile) URL.revokeObjectURL(newPostImagePreview);
    setNewPostImagePreview(null);
    setNewPostImageFile(null);
    if (fanPostFileInputRef.current) fanPostFileInputRef.current.value = "";
    setShowCreateModal(false);
  };

  const tabs = [
    { id: "ARTIST", label: "Artist" },
    { id: "FAN", label: "Fan" },
    { id: "LIVE", label: "Live" },
    { id: "NOTICE", label: "Notice" },
    { id: "MARKET", label: "Market" },
  ];

  const artistLives = MOCK_LIVES.filter((l) => l.artistId === artist.id);
  const liveNow = artistLives.filter((l) => l.status === "LIVE");
  const vodList = artistLives.filter((l) => l.status === "ENDED" || l.status === "RECORDED");

  return (
    <div className="flex flex-col min-h-full relative">
      {/* 커버 + 다크 오버레이 */}
      <div className="h-56 w-full relative overflow-hidden shrink-0">
        <img src={artist.cover} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0814]/40 to-[#0b0814]" />
      </div>

      <div className="max-w-6xl w-full mx-auto px-8 relative -mt-16 z-10 shrink-0">
        <Surface variant="primary" className="p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 rounded-2xl border border-white/[0.06]">
          <div className="flex items-end gap-6">
            <div className="rounded-2xl border-2 border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.4)] -mt-20 overflow-hidden bg-[#201a33]">
              <img
                src={artist.avatar}
                className="size-32 rounded-2xl object-cover w-full h-full"
                alt=""
              />
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-semibold text-white tracking-tight">
                  {artist.name}
                </h1>
                <span className="material-symbols-outlined text-violet-300 fill-icon text-2xl">
                  verified
                </span>
              </div>
              <p className="text-white/55 font-medium text-sm mt-1">
                팔로워 {artist.memberCount} • 포스트 {artist.postCount}개
              </p>
            </div>
          </div>
          <div className="pb-1">
            {artist.isSubscribed ? (
              <Button variant="ghost" className="px-8 py-3" disabled>
                구독 중
              </Button>
            ) : (
              <Button variant="primary" className="px-8 py-3">
                구독하기
              </Button>
            )}
          </div>
        </Surface>
      </div>

      {/* 탭 — 활성만 퍼플, 비활성 저채도, underline */}
      <div className="sticky top-16 bg-[#0b0814]/95 backdrop-blur-md z-20 border-b border-white/[0.06] mt-8 shrink-0">
        <div className="max-w-6xl mx-auto px-8 flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`py-4 text-sm font-medium tracking-wide transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-violet-400 text-violet-300"
                  : "border-transparent text-white/55 hover:text-white/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl w-full mx-auto px-8 py-8 flex-1 grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {activeTab === "ARTIST" && (
            <PostFeed
              posts={artistPosts}
              postLinkBase="/posts"
              showVerifiedByType={true}
              isLikedMap={Object.fromEntries([...likedPostIds].map((id) => [id, true]))}
              onLike={handleLike}
              onComment={(postId) => router.push(`/posts/${postId}#comments`)}
            />
          )}

          {activeTab === "FAN" && (
            <>
              {artist.isSubscribed ? (
                <>
                  <div className="flex justify-end items-center px-2 mb-4">
                    <Button
                      variant="primary"
                      className="text-xs uppercase tracking-widest"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <span className="material-symbols-outlined text-lg mr-1.5 align-middle">edit_note</span>
                      팬 포스트 작성
                    </Button>
                  </div>
                  <PostFeed
                    posts={localFanPosts}
                    postLinkBase="/posts"
                    showVerifiedByType={true}
                    isLikedMap={Object.fromEntries([...likedPostIds].map((id) => [id, true]))}
                    onLike={handleLike}
                    onComment={(postId) => router.push(`/posts/${postId}#comments`)}
                  />
                </>
              ) : (
                <Surface variant="primary" className="p-12 text-center">
                  <p className="text-white/55 italic font-medium">
                    팬 포스트는 구독 중인 회원만 작성하고 볼 수 있습니다.
                  </p>
                </Surface>
              )}
            </>
          )}

          {activeTab === "LIVE" && (
            <div className="space-y-12">
              {liveNow.length > 0 && (
                <section>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/55 mb-4 px-1">LIVE NOW</h3>
                  <Link href={`/live/${liveNow[0].id}`} className="block group">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#201a33] border border-white/[0.08] hover:border-white/[0.12] hover:shadow-[0_0_24px_rgba(139,92,246,0.08)] transition-all">
                      <img src={liveNow[0].thumbnail} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-red-500/90 text-white text-[9px] font-black uppercase rounded">LIVE</span>
                        {liveNow[0].viewerCount && (
                          <span className="px-2 py-0.5 bg-black/40 text-white/90 text-[9px] font-bold rounded flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">visibility</span>
                            {liveNow[0].viewerCount}
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h4 className="font-bold text-white text-lg truncate">{liveNow[0].title}</h4>
                      </div>
                    </div>
                  </Link>
                </section>
              )}
              <section>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/55 mb-4 px-1">다시보기</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {vodList.map((vod) => (
                    <Link key={vod.id} href={`/live/${vod.id}`} className="block group">
                      <div className="rounded-2xl overflow-hidden bg-[#201a33] border border-white/[0.08] hover:border-white/[0.1] hover:shadow-[0_0_20px_rgba(139,92,246,0.06)] transition-all">
                        <div className="aspect-video relative overflow-hidden">
                          <img src={vod.thumbnail} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white text-5xl">play_circle</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-white truncate mb-1">{vod.title}</h4>
                          <p className="text-[10px] text-white/55 font-medium">{vod.startTime}</p>
                          {vod.timeLabel && vod.timeLabel !== "종료" && (
                            <p className="text-[10px] text-white/45 mt-0.5">{vod.timeLabel}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {vodList.length === 0 && (
                  <div className="py-16 text-center rounded-2xl bg-[#201a33] border border-white/[0.06]">
                    <p className="text-white/50 text-sm">다시보기 영상이 없습니다.</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "NOTICE" && (
            <div className="space-y-4">
              {artistNotices.map((post) => (
                <Surface key={post.id} variant="primary" className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white/90 text-[8px] font-black uppercase">
                      Notice
                    </span>
                    <span className="text-[10px] font-bold text-white/55">{post.timestamp}</span>
                  </div>
                  <h4 className="font-bold text-white mb-2">
                    {post.content.slice(0, 50)}...
                  </h4>
                  <Link
                    href={`/posts/${post.id}`}
                    className="text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                  >
                    전체보기
                  </Link>
                </Surface>
              ))}
              {artistNotices.length === 0 && (
                <Surface variant="primary" className="py-20 text-center">
                  <p className="text-white/55 italic">공지사항이 없습니다.</p>
                </Surface>
              )}
            </div>
          )}
        </div>

        <aside className="hidden lg:col-span-4 lg:flex flex-col gap-6">
          {/* 멤버십 — Primary 퍼플 1개 강조 */}
          <Surface variant="primary" className="p-8 border border-violet-500/20">
            <div className="mb-6">
              <span className="bg-violet-500/20 text-violet-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Exclusive Access
              </span>
              <h3 className="font-black text-2xl text-white mt-4 leading-tight">공식 멤버십 가입</h3>
              <p className="text-sm text-white/70 mt-4 leading-relaxed font-medium">
                {artist.name}를 직접 응원하고 전용 스트리밍과 굿즈 혜택을 받으세요.
              </p>
            </div>
            <div className="bg-white/[0.06] rounded-2xl p-4 mb-8 border border-white/[0.06]">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/55">
                  멤버십 1단계
                </span>
                <span className="font-black text-xl text-white flex items-center gap-1 tabular-nums">
                  <span className="material-symbols-outlined text-violet-300 fill-icon">token</span>
                  {CANDY_COST} 캔디 / 월
                </span>
              </div>
            </div>
            <div className="mb-6 px-1 flex justify-between items-center text-[11px] font-bold text-white/55 uppercase tracking-widest">
              <span>내 보유 캔디</span>
              <span className="text-white tabular-nums">{candyBalance.toLocaleString()} 캔디</span>
            </div>
            {candyBalance >= CANDY_COST ? (
              <Button
                href={`/candy/payment?artistId=${artist.id}`}
                variant="primary"
                className="w-full py-4 text-xs uppercase tracking-widest"
              >
                캔디로 구독하기
              </Button>
            ) : (
              <Button
                href="/candy/recharge"
                variant="primary"
                className="w-full py-4 text-xs uppercase tracking-widest"
              >
                캔디 충전하기
              </Button>
            )}
            <p className="text-[9px] text-center text-white/45 mt-4">
              캔디 차감 시 즉시 혜택이 적용됩니다
            </p>
          </Surface>

          {/* 멤버 목록 — 톤 다운 */}
          <Surface variant="secondary" className="p-8 sticky top-24">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/55 mb-6">
              Members
            </h3>
            <div className="space-y-4">
              {artist.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors group"
                >
                  <img
                    src={member.avatar}
                    className="size-12 rounded-xl border border-white/[0.08]"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{member.name}</p>
                    <Link
                      href="/dm/fan"
                      className="text-[10px] font-black text-violet-300 uppercase tracking-widest mt-1 hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">mail</span>
                      DM 보내기
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        </aside>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <Surface variant="primary" className="w-full max-w-xl p-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">팬 포스트 작성</h3>
              <button
                type="button"
                onClick={() => {
                  if (newPostImagePreview && newPostImageFile) URL.revokeObjectURL(newPostImagePreview);
                  setNewPostImagePreview(null);
                  setNewPostImageFile(null);
                  setShowCreateModal(false);
                }}
                className="size-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white/80 hover:bg-white/[0.12] transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full h-40 bg-[#201a33] rounded-2xl p-4 border border-white/[0.06] outline-none focus:ring-2 focus:ring-violet-500/20 text-white placeholder:text-white/40 font-medium"
              placeholder="아티스트를 향한 따뜻한 한마디..."
            />
            <div className="mt-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/55 mb-2 block">사진 첨부</span>
              <input
                ref={fanPostFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFanPostImageChange}
                className="hidden"
              />
              {!newPostImagePreview ? (
                <button
                  type="button"
                  onClick={() => fanPostFileInputRef.current?.click()}
                  className="w-full py-6 rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] text-white/50 hover:border-violet-500/30 hover:text-violet-300/70 transition-colors flex flex-col items-center gap-2"
                >
                  <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                  <span className="text-xs font-bold">클릭하여 사진 추가</span>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
                  <img src={newPostImagePreview} alt="미리보기" className="w-full max-h-48 object-contain bg-black/20" />
                  <button
                    type="button"
                    onClick={removeFanPostImage}
                    className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              )}
            </div>
            <div className="mt-6">
              <Button
                variant="primary"
                className="w-full py-4 text-sm uppercase tracking-widest"
                onClick={handleCreatePost}
              >
                게시하기
              </Button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
