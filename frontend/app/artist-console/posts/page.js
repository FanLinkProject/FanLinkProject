"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

function formatTimestamp(instant) {
  if (!instant) return "";
  try {
    const date = new Date(instant);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "방금 전";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString("ko-KR");
  } catch {
    return "";
  }
}

// targetType → 한국어 라벨
function targetTypeLabel(type) {
  if (!type) return "";
  switch (type.toUpperCase()) {
    case "ARTIST": return "아티스트 포스트";
    case "FAN":    return "팬 포스트";
    case "REPLAY": return "다시보기";
    default:       return type;
  }
}

// targetType → 포스트 상세 경로
function postDetailHref(targetType, targetId) {
  if (!targetId) return "#";
  switch ((targetType || "").toUpperCase()) {
    case "ARTIST": return `/posts/${targetId}?type=ARTIST&from=artist-console`;
    case "FAN":    return `/posts/${targetId}?type=FAN&from=artist-console`;
    case "REPLAY": return `/live/${targetId}`;
    default:       return `/posts/${targetId}`;
  }
}

const POSTS_LIMIT = 10;
const COMMENTS_PAGE_SIZE = 20;

export default function ArtistPostsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ARTIST");

  // 현재 사용자
  const [myId, setMyId] = useState(null);
  const [myProfile, setMyProfile] = useState(null);

  // 아티스트 소식 state
  const [artistPosts, setArtistPosts] = useState([]);
  const [artistPostsLoading, setArtistPostsLoading] = useState(false);
  const [artistPostsHasNext, setArtistPostsHasNext] = useState(false);
  const [artistPostsLastId, setArtistPostsLastId] = useState(null);
  const [artistPostsLoadingMore, setArtistPostsLoadingMore] = useState(false);
  const artistPostsBottomRef = useRef(null);

  // 팬 커뮤니티(내 댓글) state
  const [myComments, setMyComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsHasNext, setCommentsHasNext] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);

  // 프로필 로드
  useEffect(() => {
    request("/api/user/profile")
      .then((data) => {
        setMyId(data.id ?? null);
        setMyProfile(data);
      })
      .catch(() => {});
  }, []);

  // [A] 아티스트 소식 탭 초기 로드
  useEffect(() => {
    if (activeTab !== "ARTIST" || !myId) return;
    setArtistPostsLoading(true);
    setArtistPostsHasNext(false);
    setArtistPostsLastId(null);
    request("/api/artist-posts/my", { query: { limit: POSTS_LIMIT } })
      .then((data) => {
        const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
        setArtistPosts(raw);
        setArtistPostsHasNext(raw.length === POSTS_LIMIT);
        if (raw.length > 0) setArtistPostsLastId(raw[raw.length - 1].id);
      })
      .catch(() => setArtistPosts([]))
      .finally(() => setArtistPostsLoading(false));
  }, [activeTab, myId]);

  // [B] 팬 커뮤니티 탭 초기 로드
  useEffect(() => {
    if (activeTab !== "FAN" || !myId) return;
    setCommentsLoading(true);
    setCommentsPage(0);
    request("/api/comments/my", { query: { page: 0, size: COMMENTS_PAGE_SIZE } })
      .then((data) => {
        const content = data?.content ?? [];
        setMyComments(content);
        setCommentsHasNext(!data?.last ?? false);
        setCommentsPage(0);
      })
      .catch(() => setMyComments([]))
      .finally(() => setCommentsLoading(false));
  }, [activeTab, myId]);

  // 아티스트 포스트 더 불러오기
  const loadMoreArtistPosts = useCallback(async () => {
    if (!myId || artistPostsLoadingMore || !artistPostsHasNext || !artistPostsLastId) return;
    setArtistPostsLoadingMore(true);
    try {
      const data = await request("/api/artist-posts/my", {
        query: { lastPostId: artistPostsLastId, limit: POSTS_LIMIT },
      });
      const raw = Array.isArray(data) ? data : (data?.content ?? data?.posts ?? []);
      setArtistPosts((prev) => [...prev, ...raw]);
      setArtistPostsHasNext(raw.length === POSTS_LIMIT);
      if (raw.length > 0) setArtistPostsLastId(raw[raw.length - 1].id);
    } catch {}
    setArtistPostsLoadingMore(false);
  }, [myId, artistPostsLoadingMore, artistPostsHasNext, artistPostsLastId]);

  // 댓글 더 불러오기
  const loadMoreComments = async () => {
    if (commentsLoadingMore || !commentsHasNext) return;
    setCommentsLoadingMore(true);
    try {
      const nextPage = commentsPage + 1;
      const data = await request("/api/comments/my", {
        query: { page: nextPage, size: COMMENTS_PAGE_SIZE },
      });
      const content = data?.content ?? [];
      setMyComments((prev) => [...prev, ...content]);
      setCommentsHasNext(!data?.last ?? false);
      setCommentsPage(nextPage);
    } catch {}
    setCommentsLoadingMore(false);
  };

  // 아티스트 포스트 무한스크롤 Observer
  useEffect(() => {
    if (!artistPostsHasNext || artistPostsLoading) return;
    const el = artistPostsBottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreArtistPosts(); },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [artistPostsHasNext, artistPostsLastId, loadMoreArtistPosts, artistPostsLoading]);

  // 아티스트 포스트 삭제
  const handleDeletePost = async (postId) => {
    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
    try {
      await request(`/api/artist-posts/${postId}`, { method: "DELETE" });
      setArtistPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("게시글 삭제 실패", err);
    }
  };

  const displayAvatar = myProfile?.profileImageUrl || "";
  const displayName = myProfile?.nickname || "";

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <SectionTitle className="text-2xl font-bold">게시물 관리</SectionTitle>
          <p className="text-sm text-white/55 font-medium mt-1">
            그룹 콘텐츠 피드와 팬 커뮤니티를 관리합니다.
          </p>
        </div>
      </header>

      {/* 탭 */}
      <div className="flex gap-2 p-1 bg-white/[0.04] rounded-2xl w-fit border border-white/[0.06]">
        <button
          type="button"
          onClick={() => setActiveTab("ARTIST")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "ARTIST"
              ? "bg-[#201a33] text-violet-300 border border-white/[0.08]"
              : "text-white/55 hover:text-white/80"
          }`}
        >
          작성한 글
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("FAN")}
          className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === "FAN"
              ? "bg-[#201a33] text-violet-300 border border-white/[0.08]"
              : "text-white/55 hover:text-white/80"
          }`}
        >
          작성한 댓글
        </button>
      </div>

      {/* 아티스트 소식 탭 */}
      {activeTab === "ARTIST" && (
        <div className="space-y-4">
          {artistPostsLoading ? (
            <Surface variant="primary" className="py-12 text-center">
              <p className="text-white/55">로딩 중...</p>
            </Surface>
          ) : artistPosts.length === 0 ? (
            <Surface variant="primary" className="py-20 text-center">
              <p className="text-white/55 italic">작성한 게시글이 없습니다.</p>
            </Surface>
          ) : (
            <>
              {artistPosts.map((post) => (
                <Surface
                  key={post.id}
                  variant="primary"
                  className="p-8 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_12px_rgba(150,100,255,0.08)] transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {(post.writerProfileImageUrl || displayAvatar) && (
                        <img
                          src={post.writerProfileImageUrl || displayAvatar}
                          className="size-10 rounded-full border border-white/[0.08]"
                          alt=""
                        />
                      )}
                      <div>
                        <p className="font-bold text-white">
                          {post.writerNickname || displayName}
                        </p>
                        <p className="text-[10px] text-white/55 font-black uppercase tracking-widest">
                          {formatTimestamp(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.isMembershipOnly && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-black uppercase tracking-widest">
                          멤버십 전용
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        href={`/artist-console/posts/${post.id}/edit`}
                        className="px-4 py-2 text-[10px] uppercase tracking-widest"
                      >
                        수정
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="px-4 py-2 bg-red-500/15 text-red-400/90 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/25 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <p className="text-white/80 leading-relaxed font-medium line-clamp-3">
                    {post.content}
                  </p>
                  {post.group && (
                    <p className="text-[10px] text-white/40 mt-3 font-bold">
                      그룹: {post.group.nickname || post.group.id}
                    </p>
                  )}
                </Surface>
              ))}

              {/* 무한스크롤 sentinel */}
              <div ref={artistPostsBottomRef} className="py-1">
                {artistPostsLoadingMore && (
                  <p className="text-white/40 text-xs text-center py-4">
                    불러오는 중...
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 팬 커뮤니티 탭 — 내가 작성한 댓글 */}
      {activeTab === "FAN" && (
        <div className="space-y-4">
          {commentsLoading ? (
            <Surface variant="primary" className="py-12 text-center">
              <p className="text-white/55">로딩 중...</p>
            </Surface>
          ) : myComments.length === 0 ? (
            <Surface variant="primary" className="py-20 text-center">
              <p className="text-white/55 italic">작성한 댓글이 없습니다.</p>
            </Surface>
          ) : (
            <>
              {myComments.map((comment) => (
                <Surface key={comment.id} variant="primary" className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 게시물 정보 */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded bg-white/[0.08] text-white/70 text-[9px] font-black uppercase tracking-widest">
                          {targetTypeLabel(comment.targetType)}
                        </span>
                        {comment.parentId && (
                          <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-300/80 text-[9px] font-black uppercase tracking-widest">
                            대댓글
                          </span>
                        )}
                        <span className="text-[10px] text-white/40 font-bold">
                          {formatTimestamp(comment.createdAt)}
                        </span>
                      </div>

                      {/* 댓글 내용 */}
                      <p className="text-white/80 font-medium leading-relaxed line-clamp-3">
                        {comment.content}
                      </p>
                    </div>

                    {/* 해당 게시물 바로가기 */}
                    <Link
                      href={postDetailHref(comment.targetType, comment.targetId)}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-black text-violet-300 uppercase tracking-widest hover:underline mt-1"
                    >
                      <span className="material-symbols-outlined text-sm">
                        open_in_new
                      </span>
                      게시물 보기
                    </Link>
                  </div>
                </Surface>
              ))}

              {/* 더 보기 버튼 */}
              {commentsHasNext && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    onClick={loadMoreComments}
                    disabled={commentsLoadingMore}
                    className="px-8 py-3 text-xs uppercase tracking-widest"
                  >
                    {commentsLoadingMore ? "로딩 중..." : "댓글 더 보기"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
