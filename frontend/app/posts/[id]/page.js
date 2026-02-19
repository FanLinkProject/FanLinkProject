"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MOCK_POSTS, MOCK_ARTISTS } from "@/lib/mockData";
import { request } from "@/lib/api";

function getCurrentUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("accessToken");
  if (!raw) return null;
  try {
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return { email: payload.sub, role: (payload.role || "").replace("ROLE_", "") };
  } catch {
    return null;
  }
}

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

function PostDetailContent({ id }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type"); // "ARTIST" | "FAN" | null
  const groupId = searchParams.get("groupId"); // numeric string | null
  const fromArtistConsole = searchParams.get("from") === "artist-console";

  const numericId = Number(id);
  const isRealPost = !!(type && groupId && !isNaN(numericId) && numericId > 0);
  const likeTargetType = type === "FAN" ? "FAN_POST" : "ARTIST_POST";
  const commentTargetType = type === "FAN" ? "FAN" : "ARTIST";

  const [post, setPost] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myNickname, setMyNickname] = useState("");
  const [myProfileImageUrl, setMyProfileImageUrl] = useState("");
  const [backArtistId, setBackArtistId] = useState(groupId || null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    if (user) {
      request("/api/user/profile")
        .then((data) => {
          setMyNickname(data.nickname || "");
          setMyProfileImageUrl(data.profileImageUrl || "");
        })
        .catch(() => {});
    }
  }, []);

  // 포스트 + 좋아요 데이터 로드
  useEffect(() => {
    if (!isRealPost) {
      // mock 데이터 폴백
      const p = MOCK_POSTS.find((x) => x.id === id) || MOCK_POSTS[0];
      setPost({
        id: p.id,
        authorName: p.authorName,
        authorAvatar: p.authorAvatar,
        content: p.content,
        image: p.image || null,
        timestamp: p.timestamp,
        postType: p.type,
      });
      setLikeCount(p.likes || 0);
      if (!groupId) {
        const a = MOCK_ARTISTS.find((x) => x.id === p.artistId);
        if (a) setBackArtistId(a.id);
      }
      return;
    }

    const endpoint =
      type === "FAN" ? `/api/fan-posts/${numericId}` : `/api/artist-posts/${numericId}`;
    const user = getCurrentUser();

    Promise.all([
      request(endpoint),
      request("/api/likes/counts", {
        query: { targetType: likeTargetType, targetIds: numericId },
      }).catch(() => ({})),
      user
        ? request("/api/likes/check", {
            query: { targetType: likeTargetType, targetIds: numericId },
          }).catch(() => ({}))
        : Promise.resolve({}),
    ])
      .then(([postData, countRes, checkRes]) => {
        setPost({
          id: postData.id,
          authorName: postData.writerNickname || "",
          authorAvatar: postData.writerProfileImageUrl || "",
          content: postData.content || "",
          image: postData.attachments?.[0]?.url || null,
          timestamp: formatTimestamp(postData.createdAt),
          postType: type,
        });
        const countVal =
          countRes?.[numericId] ?? countRes?.[String(numericId)] ?? 0;
        // checkRes는 List<Long> 배열 (좋아요한 ID 목록) → includes로 확인
        const isLikedVal = Array.isArray(checkRes)
          ? checkRes.map(Number).includes(numericId)
          : !!(checkRes?.[numericId] ?? checkRes?.[String(numericId)]);
        setLikeCount(typeof countVal === "number" ? countVal : Number(countVal) || 0);
        setIsLiked(isLikedVal);
      })
      .catch(console.error);
  }, [id, isRealPost, type, numericId, likeTargetType, groupId]);

  // 댓글 로드
  useEffect(() => {
    if (!isRealPost) return;
    setCommentsLoading(true);
    request("/api/comments", {
      query: { targetType: commentTargetType, targetId: numericId },
    })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.content ?? []);
        setComments(list);
      })
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [id, isRealPost, commentTargetType, numericId]);

  const handleLike = () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    if (!isRealPost) return;
    request("/api/likes", {
      method: "POST",
      body: { targetType: likeTargetType, targetId: numericId },
    }).catch(() => {
      setIsLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    });
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitLoading) return;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setSubmitLoading(true);
    try {
      if (isRealPost) {
        // 백엔드 POST /api/comments 응답은 Long (댓글 ID만 반환)
        const createdId = await request("/api/comments", {
          method: "POST",
          body: {
            targetType: commentTargetType,
            targetId: numericId,
            content: newComment.trim(),
          },
        });
        // 반환된 ID + 현재 사용자 정보로 로컬 댓글 객체 구성
        setComments((prev) => [
          {
            id: typeof createdId === "number" ? createdId : Date.now(),
            nickname: myNickname || "나",
            profileImageUrl: myProfileImageUrl || null,
            content: newComment.trim(),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        setComments((prev) => [
          {
            id: Date.now(),
            nickname: myNickname || "팬",
            profileImageUrl: myProfileImageUrl || null,
            content: newComment,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setNewComment("");
    } catch (err) {
      console.error("댓글 작성 실패", err);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!post) return null;

  const backHref = fromArtistConsole
    ? "/artist-console"
    : backArtistId
    ? `/artists/${backArtistId}${type === "FAN" ? "?tab=FAN" : ""}`
    : "/";

  return (
    <div className="max-w-6xl mx-auto p-8 flex flex-col lg:flex-row gap-8 min-h-full">
      <div className="flex-1 space-y-6">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-white/55 hover:text-violet-300 font-bold text-xs uppercase tracking-widest transition-all mb-4"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {fromArtistConsole
            ? "아티스트 콘솔로 돌아가기"
            : type === "FAN"
            ? "팬 페이지로 돌아가기"
            : "아티스트 페이지로 돌아가기"}
        </Link>

        <article className="bg-[#201a33] rounded-[2.5rem] border border-white/[0.08] overflow-hidden">
          {post.image && (
            <div className="w-full aspect-video overflow-hidden">
              <img src={post.image} className="w-full h-full object-cover" alt="" />
            </div>
          )}
          <div className="p-10">
            <div className="flex items-center gap-4 mb-8">
              <img
                src={post.authorAvatar}
                className="size-14 rounded-2xl border-2 border-white/[0.1] object-cover"
                alt=""
              />
              <div>
                <h4 className="text-lg font-extrabold text-white">{post.authorName}</h4>
                <p className="text-xs text-white/55 font-semibold uppercase tracking-wider">
                  {post.timestamp}
                  {post.postType === "ARTIST" && " • 공식 업데이트"}
                </p>
              </div>
            </div>
            <div className="prose max-w-none">
              <p className="text-white/85 text-xl leading-relaxed font-light">
                &quot;{post.content}&quot;
              </p>
            </div>

            {/* 좋아요 버튼 */}
            <div className="flex items-center gap-2 mt-8 pt-6 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleLike}
                aria-pressed={isLiked}
                aria-label={isLiked ? "좋아요 취소" : "좋아요"}
                className={
                  "inline-flex items-center gap-2 text-sm font-bold transition-colors focus:outline-none " +
                  (isLiked
                    ? "text-red-400"
                    : "text-white/55 hover:text-red-400 focus:text-red-400")
                }
              >
                <span
                  className={
                    "material-symbols-outlined text-xl " + (isLiked ? "fill-icon" : "")
                  }
                >
                  favorite
                </span>
                <span>{likeCount}</span>
              </button>
            </div>
          </div>
        </article>
      </div>

      <aside className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        <div className="bg-[#201a33] rounded-3xl border border-white/[0.08] flex flex-col h-[calc(100vh-160px)] sticky top-24">
          <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="font-extrabold text-white">댓글 및 토론</h3>
            <span className="text-xs font-bold text-white/55 uppercase tracking-widest">
              {comments.length}개
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" id="comments">
            {commentsLoading ? (
              <p className="text-white/55 text-sm py-4 text-center">로딩 중...</p>
            ) : comments.length === 0 ? (
              <p className="text-white/55 text-sm py-4 text-center">
                아직 댓글이 없습니다.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-4">
                  <img
                    src={
                      c.profileImageUrl ||
                      `https://picsum.photos/seed/${c.id}/100/100`
                    }
                    className="size-9 rounded-full bg-white/[0.08] shrink-0 border border-white/[0.06]"
                    alt=""
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">
                        {c.nickname || "익명"}
                      </span>
                      <span className="text-[10px] font-bold text-white/55 uppercase">
                        {formatTimestamp(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-6 bg-white/[0.02] border-t border-white/[0.06]">
            <div className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                placeholder="따뜻한 댓글을 남겨주세요..."
                className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 outline-none"
              />
              <button
                type="button"
                onClick={handleSubmitComment}
                disabled={submitLoading}
                className="size-10 bg-violet-500/90 text-white rounded-xl flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50"
              >
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
