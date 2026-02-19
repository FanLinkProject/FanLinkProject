"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
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

// API 응답 댓글에 클라이언트 답글 상태 필드를 추가
function enhanceComment(c) {
  return {
    ...c,
    replies: [],
    repliesExpanded: false,
    repliesHasNext: false,
    repliesLastId: null,
    repliesLoading: false,
    repliesLoadingMore: false,
    likeCount: c.likeCount ?? 0,
    isLiked: c.isLiked ?? false,
  };
}

function PostDetailContent({ id }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type"); // "ARTIST" | "FAN" | null
  const groupId = searchParams.get("groupId");
  const fromArtistConsole = searchParams.get("from") === "artist-console";

  const numericId = Number(id);
  const isRealPost = !!(type && groupId && !isNaN(numericId) && numericId > 0);
  const likeTargetType = type === "FAN" ? "FAN_POST" : "ARTIST_POST";
  const commentTargetType = type === "FAN" ? "FAN" : "ARTIST";

  const [post, setPost] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // 댓글 상태
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsHasNext, setCommentsHasNext] = useState(false);
  const [commentsLastId, setCommentsLastId] = useState(null);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // 대댓글 작성 상태
  const [replyingToId, setReplyingToId] = useState(null); // 답글 작성 중인 부모 댓글 id
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitLoading, setReplySubmitLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myNickname, setMyNickname] = useState("");
  const [myProfileImageUrl, setMyProfileImageUrl] = useState("");
  const [backArtistId, setBackArtistId] = useState(groupId || null);

  // 댓글 컨테이너 & 무한스크롤 sentinel
  const commentsContainerRef = useRef(null);
  const commentsBottomRef = useRef(null);

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

  // 포스트 + 좋아요 로드
  useEffect(() => {
    if (!isRealPost) {
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
          }).catch(() => [])
        : Promise.resolve([]),
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
        const countVal = countRes?.[numericId] ?? countRes?.[String(numericId)] ?? 0;
        const isLikedVal = Array.isArray(checkRes)
          ? checkRes.map(Number).includes(numericId)
          : !!(checkRes?.[numericId] ?? checkRes?.[String(numericId)]);
        setLikeCount(typeof countVal === "number" ? countVal : Number(countVal) || 0);
        setIsLiked(isLikedVal);
      })
      .catch(console.error);
  }, [id, isRealPost, type, numericId, likeTargetType, groupId]);

  // 댓글 초기 로드
  useEffect(() => {
    if (!isRealPost) return;
    setCommentsLoading(true);
    request("/api/comments", {
      query: { targetType: commentTargetType, targetId: numericId },
    })
      .then(async (data) => {
        const list = Array.isArray(data) ? data : (data?.content ?? []);
        const hasNext = data?.hasNext ?? false;
        setComments(list.map(enhanceComment));
        setCommentsHasNext(hasNext);
        if (list.length > 0) setCommentsLastId(list[list.length - 1].id);
        if (list.length > 0) {
          const ids = list.map((c) => c.id);
          const user = getCurrentUser();
          const [countRes, checkRes] = await Promise.all([
            request("/api/likes/counts", { query: { targetType: "COMMENT", targetIds: ids.join(",") } }).catch(() => ({})),
            user
              ? request("/api/likes/check", { query: { targetType: "COMMENT", targetIds: ids.join(",") } }).catch(() => [])
              : Promise.resolve([]),
          ]);
          const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
          setComments((prev) =>
            prev.map((c) => {
              if (!ids.includes(c.id)) return c;
              const count = countRes?.[c.id] ?? countRes?.[String(c.id)] ?? 0;
              return { ...c, likeCount: Number(count) || 0, isLiked: likedSet.has(Number(c.id)) };
            })
          );
        }
      })
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [id, isRealPost, commentTargetType, numericId]);

  // 댓글 더 불러오기
  const loadMoreComments = useCallback(async () => {
    if (!isRealPost || commentsLoadingMore || !commentsHasNext || !commentsLastId) return;
    setCommentsLoadingMore(true);
    try {
      const data = await request("/api/comments", {
        query: { targetType: commentTargetType, targetId: numericId, lastId: commentsLastId },
      });
      const list = Array.isArray(data) ? data : (data?.content ?? []);
      const hasNext = data?.hasNext ?? false;
      setComments((prev) => [...prev, ...list.map(enhanceComment)]);
      setCommentsHasNext(hasNext);
      if (list.length > 0) setCommentsLastId(list[list.length - 1].id);
      if (list.length > 0) {
        const ids = list.map((c) => c.id);
        const user = getCurrentUser();
        const [countRes, checkRes] = await Promise.all([
          request("/api/likes/counts", { query: { targetType: "COMMENT", targetIds: ids.join(",") } }).catch(() => ({})),
          user
            ? request("/api/likes/check", { query: { targetType: "COMMENT", targetIds: ids.join(",") } }).catch(() => [])
            : Promise.resolve([]),
        ]);
        const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
        setComments((prev) =>
          prev.map((c) => {
            if (!ids.includes(c.id)) return c;
            const count = countRes?.[c.id] ?? countRes?.[String(c.id)] ?? 0;
            return { ...c, likeCount: Number(count) || 0, isLiked: likedSet.has(Number(c.id)) };
          })
        );
      }
    } catch {}
    setCommentsLoadingMore(false);
  }, [isRealPost, commentsLoadingMore, commentsHasNext, commentsLastId, commentTargetType, numericId]);

  // 댓글 무한스크롤 IntersectionObserver
  useEffect(() => {
    if (!commentsHasNext) return;
    const container = commentsContainerRef.current;
    const sentinel = commentsBottomRef.current;
    if (!container || !sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreComments(); },
      { root: container, rootMargin: "80px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [commentsHasNext, commentsLastId, loadMoreComments]);

  // 답글 처음 로드 (펼치기)
  const loadReplies = async (commentId) => {
    setComments((prev) =>
      prev.map((c) => c.id === commentId ? { ...c, repliesLoading: true, repliesExpanded: true } : c)
    );
    try {
      const data = await request(`/api/comments/${commentId}/replies`);
      const list = Array.isArray(data) ? data : (data?.content ?? []);
      const hasNext = data?.hasNext ?? false;
      let enrichedList = list;
      if (list.length > 0) {
        const ids = list.map((r) => r.id);
        const user = getCurrentUser();
        const [countRes, checkRes] = await Promise.all([
          request("/api/likes/counts", { query: { targetType: "COMMENT", targetIds: ids.join(",") } }).catch(() => ({})),
          user
            ? request("/api/likes/check", { query: { targetType: "COMMENT", targetIds: ids.join(",") } }).catch(() => [])
            : Promise.resolve([]),
        ]);
        const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
        enrichedList = list.map((r) => ({
          ...r,
          likeCount: Number(countRes?.[r.id] ?? countRes?.[String(r.id)] ?? 0) || 0,
          isLiked: likedSet.has(Number(r.id)),
        }));
      }
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: enrichedList,
                repliesHasNext: hasNext,
                repliesLastId: enrichedList.length > 0 ? enrichedList[enrichedList.length - 1].id : null,
                repliesLoading: false,
              }
            : c
        )
      );
    } catch {
      setComments((prev) =>
        prev.map((c) => c.id === commentId ? { ...c, repliesLoading: false } : c)
      );
    }
  };

  // 답글 더 불러오기
  const loadMoreReplies = async (commentId, lastId) => {
    setComments((prev) =>
      prev.map((c) => c.id === commentId ? { ...c, repliesLoadingMore: true } : c)
    );
    try {
      const data = await request(`/api/comments/${commentId}/replies`, {
        query: { lastId },
      });
      const list = Array.isArray(data) ? data : (data?.content ?? []);
      const hasNext = data?.hasNext ?? false;
      let enrichedList = list;
      if (list.length > 0) {
        const ids = list.map((r) => r.id);
        const user = getCurrentUser();
        const [countRes, checkRes] = await Promise.all([
          request("/api/likes/counts", { query: { targetType: "COMMENT", targetIds: ids.join(",") } }).catch(() => ({})),
          user
            ? request("/api/likes/check", { query: { targetType: "COMMENT", targetIds: ids.join(",") } }).catch(() => [])
            : Promise.resolve([]),
        ]);
        const likedSet = new Set((Array.isArray(checkRes) ? checkRes : []).map(Number));
        enrichedList = list.map((r) => ({
          ...r,
          likeCount: Number(countRes?.[r.id] ?? countRes?.[String(r.id)] ?? 0) || 0,
          isLiked: likedSet.has(Number(r.id)),
        }));
      }
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: [...c.replies, ...enrichedList],
                repliesHasNext: hasNext,
                repliesLastId: enrichedList.length > 0 ? enrichedList[enrichedList.length - 1].id : null,
                repliesLoadingMore: false,
              }
            : c
        )
      );
    } catch {
      setComments((prev) =>
        prev.map((c) => c.id === commentId ? { ...c, repliesLoadingMore: false } : c)
      );
    }
  };

  const collapseReplies = (commentId) => {
    setComments((prev) =>
      prev.map((c) => c.id === commentId ? { ...c, repliesExpanded: false } : c)
    );
  };

  const openReplyInput = (commentId) => {
    setReplyingToId((prev) => (prev === commentId ? null : commentId));
    setReplyContent("");
  };

  const handleSubmitReply = async (parentCommentId) => {
    if (!replyContent.trim() || replySubmitLoading) return;
    if (!currentUser) { router.push("/login"); return; }
    setReplySubmitLoading(true);
    try {
      if (isRealPost) {
        const createdId = await request("/api/comments", {
          method: "POST",
          body: {
            targetType: commentTargetType,
            targetId: numericId,
            content: replyContent.trim(),
            parentId: parentCommentId,
          },
        });
        const newReply = {
          id: typeof createdId === "number" ? createdId : Date.now(),
          nickname: myNickname || "나",
          profileImageUrl: myProfileImageUrl || null,
          content: replyContent.trim(),
          createdAt: new Date().toISOString(),
          status: 1,
          isArtist: false,
        };
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? {
                  ...c,
                  replyCount: (c.replyCount || 0) + 1,
                  hasReplies: true,
                  repliesExpanded: true,
                  replies: [...(c.replies || []), newReply],
                }
              : c
          )
        );
      } else {
        const newReply = {
          id: Date.now(),
          nickname: myNickname || "팬",
          profileImageUrl: myProfileImageUrl || null,
          content: replyContent.trim(),
          createdAt: new Date().toISOString(),
          status: 1,
          isArtist: false,
        };
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? {
                  ...c,
                  replyCount: (c.replyCount || 0) + 1,
                  hasReplies: true,
                  repliesExpanded: true,
                  replies: [...(c.replies || []), newReply],
                }
              : c
          )
        );
      }
      setReplyContent("");
      setReplyingToId(null);
    } catch (err) {
      console.error("대댓글 작성 실패", err);
    } finally {
      setReplySubmitLoading(false);
    }
  };

  const handleCommentLike = async (commentId) => {
    if (!currentUser) { router.push("/login"); return; }
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, isLiked: !c.isLiked, likeCount: (c.likeCount || 0) + (c.isLiked ? -1 : 1) }
          : c
      )
    );
    try {
      await request("/api/likes", { method: "POST", body: { targetType: "COMMENT", targetId: commentId } });
    } catch {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, isLiked: !c.isLiked, likeCount: (c.likeCount || 0) + (c.isLiked ? 1 : -1) }
            : c
        )
      );
    }
  };

  const handleReplyLike = async (parentCommentId, replyId) => {
    if (!currentUser) { router.push("/login"); return; }
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentCommentId
          ? {
              ...c,
              replies: c.replies.map((r) =>
                r.id === replyId
                  ? { ...r, isLiked: !r.isLiked, likeCount: (r.likeCount || 0) + (r.isLiked ? -1 : 1) }
                  : r
              ),
            }
          : c
      )
    );
    try {
      await request("/api/likes", { method: "POST", body: { targetType: "COMMENT", targetId: replyId } });
    } catch {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentCommentId
            ? {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === replyId
                    ? { ...r, isLiked: !r.isLiked, likeCount: (r.likeCount || 0) + (r.isLiked ? 1 : -1) }
                    : r
                ),
              }
            : c
        )
      );
    }
  };

  const handleLike = () => {
    if (!currentUser) { router.push("/login"); return; }
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
    if (!currentUser) { router.push("/login"); return; }
    setSubmitLoading(true);
    try {
      if (isRealPost) {
        const createdId = await request("/api/comments", {
          method: "POST",
          body: { targetType: commentTargetType, targetId: numericId, content: newComment.trim() },
        });
        setComments((prev) => [
          enhanceComment({
            id: typeof createdId === "number" ? createdId : Date.now(),
            nickname: myNickname || "나",
            profileImageUrl: myProfileImageUrl || null,
            content: newComment.trim(),
            createdAt: new Date().toISOString(),
            status: 1,
            replyCount: 0,
            hasReplies: false,
          }),
          ...prev,
        ]);
      } else {
        setComments((prev) => [
          enhanceComment({
            id: Date.now(),
            nickname: myNickname || "팬",
            profileImageUrl: myProfileImageUrl || null,
            content: newComment,
            createdAt: new Date().toISOString(),
            status: 1,
            replyCount: 0,
            hasReplies: false,
          }),
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
            <div className="flex items-center gap-2 mt-8 pt-6 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleLike}
                aria-pressed={isLiked}
                aria-label={isLiked ? "좋아요 취소" : "좋아요"}
                className={
                  "inline-flex items-center gap-2 text-sm font-bold transition-colors focus:outline-none " +
                  (isLiked ? "text-red-400" : "text-white/55 hover:text-red-400 focus:text-red-400")
                }
              >
                <span className={"material-symbols-outlined text-xl " + (isLiked ? "fill-icon" : "")}>
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

          {/* 댓글 스크롤 영역 */}
          <div
            ref={commentsContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar"
            id="comments"
          >
            {commentsLoading ? (
              <p className="text-white/55 text-sm py-4 text-center">로딩 중...</p>
            ) : comments.length === 0 ? (
              <p className="text-white/55 text-sm py-4 text-center">아직 댓글이 없습니다.</p>
            ) : (
              <>
                {comments.map((c) => {
                  const isDeleted = c.status === 0;
                  return (
                    <div key={c.id}>
                      {/* 부모 댓글 */}
                      <div className="flex gap-3">
                        <img
                          src={c.profileImageUrl || `https://picsum.photos/seed/${c.id}/100/100`}
                          className={`size-9 rounded-full bg-white/[0.08] shrink-0 border border-white/[0.06] ${isDeleted ? "opacity-40" : ""}`}
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-bold ${isDeleted ? "text-white/35" : "text-white"}`}>
                              {isDeleted ? "알 수 없음" : (c.nickname || "익명")}
                            </span>
                            {c.isArtist && !isDeleted && (
                              <span className="material-symbols-outlined text-violet-300 text-sm fill-icon">verified</span>
                            )}
                            <span className="text-[10px] font-bold text-white/55 uppercase">
                              {formatTimestamp(c.createdAt)}
                            </span>
                          </div>
                          <p className={`text-sm leading-relaxed ${isDeleted ? "text-white/35 italic" : "text-white/80"}`}>
                            {c.content}
                          </p>

                          {/* 답글 보기/접기 + 답글 달기 + 좋아요 버튼 */}
                          <div className="flex items-center gap-3 mt-2">
                            {(c.hasReplies || c.replyCount > 0) && !c.repliesExpanded && (
                              <button
                                type="button"
                                onClick={() => loadReplies(c.id)}
                                disabled={c.repliesLoading}
                                className="text-xs font-bold text-violet-300/80 hover:text-violet-300 transition-colors disabled:opacity-50"
                              >
                                {c.repliesLoading ? "로딩 중..." : `답글 ${c.replyCount}개 보기`}
                              </button>
                            )}
                            {c.repliesExpanded && (
                              <button
                                type="button"
                                onClick={() => collapseReplies(c.id)}
                                className="text-xs font-bold text-white/35 hover:text-white/55 transition-colors"
                              >
                                답글 접기
                              </button>
                            )}
                            {!isDeleted && (
                              <button
                                type="button"
                                onClick={() => openReplyInput(c.id)}
                                className={`text-xs font-bold transition-colors ${
                                  replyingToId === c.id
                                    ? "text-violet-300"
                                    : "text-white/40 hover:text-white/70"
                                }`}
                              >
                                답글 달기
                              </button>
                            )}
                            {!isDeleted && (
                              <button
                                type="button"
                                onClick={() => handleCommentLike(c.id)}
                                className={`text-xs font-bold transition-colors inline-flex items-center gap-1 ${
                                  c.isLiked ? "text-red-400" : "text-white/40 hover:text-red-400"
                                }`}
                                aria-pressed={c.isLiked}
                                aria-label={c.isLiked ? "좋아요 취소" : "좋아요"}
                              >
                                <span className={`material-symbols-outlined text-sm ${c.isLiked ? "fill-icon" : ""}`}>favorite</span>
                                {c.likeCount > 0 && <span>{c.likeCount}</span>}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 인라인 답글 입력창 */}
                      {replyingToId === c.id && (
                        <div className="ml-12 mt-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSubmitReply(c.id);
                                }
                                if (e.key === "Escape") {
                                  setReplyingToId(null);
                                  setReplyContent("");
                                }
                              }}
                              placeholder={`${c.nickname || "댓글"}에게 답글 달기...`}
                              className="flex-1 bg-[#16102a] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-violet-500/20 placeholder:text-white/40 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSubmitReply(c.id)}
                              disabled={replySubmitLoading || !replyContent.trim()}
                              className="size-8 bg-violet-500/90 text-white rounded-lg flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-50 shrink-0"
                            >
                              <span className="material-symbols-outlined text-sm">send</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setReplyingToId(null); setReplyContent(""); }}
                              className="size-8 bg-white/[0.08] text-white/60 rounded-lg flex items-center justify-center hover:bg-white/[0.12] transition-all shrink-0"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 답글 목록 (들여쓰기) */}
                      {c.repliesExpanded && (
                        <div className="ml-12 mt-3 space-y-4 border-l border-white/[0.06] pl-4">
                          {c.replies.map((r) => {
                            const rDeleted = r.status === 0;
                            return (
                              <div key={r.id} className="flex gap-3">
                                <img
                                  src={r.profileImageUrl || `https://picsum.photos/seed/${r.id}/100/100`}
                                  className={`size-7 rounded-full bg-white/[0.08] shrink-0 border border-white/[0.06] ${rDeleted ? "opacity-40" : ""}`}
                                  alt=""
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`text-xs font-bold ${rDeleted ? "text-white/35" : "text-white"}`}>
                                      {rDeleted ? "알 수 없음" : (r.nickname || "익명")}
                                    </span>
                                    {r.isArtist && !rDeleted && (
                                      <span className="material-symbols-outlined text-violet-300 text-xs fill-icon">verified</span>
                                    )}
                                    <span className="text-[10px] font-bold text-white/55 uppercase">
                                      {formatTimestamp(r.createdAt)}
                                    </span>
                                  </div>
                                  <p className={`text-xs leading-relaxed ${rDeleted ? "text-white/35 italic" : "text-white/75"}`}>
                                    {r.content}
                                  </p>
                                  {!rDeleted && (
                                    <button
                                      type="button"
                                      onClick={() => handleReplyLike(c.id, r.id)}
                                      className={`mt-1 text-[10px] font-bold transition-colors inline-flex items-center gap-0.5 ${
                                        r.isLiked ? "text-red-400" : "text-white/35 hover:text-red-400"
                                      }`}
                                      aria-pressed={r.isLiked}
                                      aria-label={r.isLiked ? "좋아요 취소" : "좋아요"}
                                    >
                                      <span className={`material-symbols-outlined text-xs ${r.isLiked ? "fill-icon" : ""}`}>favorite</span>
                                      {r.likeCount > 0 && <span>{r.likeCount}</span>}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {c.repliesHasNext && (
                            <button
                              type="button"
                              onClick={() => loadMoreReplies(c.id, c.repliesLastId)}
                              disabled={c.repliesLoadingMore}
                              className="text-xs font-bold text-violet-300/70 hover:text-violet-300 transition-colors disabled:opacity-50"
                            >
                              {c.repliesLoadingMore ? "로딩 중..." : "답글 더 보기"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 무한스크롤 sentinel */}
                <div ref={commentsBottomRef} className="py-1">
                  {commentsLoadingMore && (
                    <p className="text-white/40 text-xs text-center py-2">불러오는 중...</p>
                  )}
                </div>
              </>
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
