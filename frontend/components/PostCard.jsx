"use client";

import Link from "next/link";
import Surface from "@/components/ui/Surface";

export default function PostCard({
  post,
  href,
  showVerified = false,
  isLiked = false,
  onLike,
  likeCount,
  commentCount,
  onComment,
  showCommentButton = true,
  isLocked = false,
  isMembershipOnly = false,
  onDelete,
  onEdit,
  className = "",
}) {
  const displayName = post.authorMemberName ?? post.authorName ?? "";
  const gradeName = post.authorGradeName ?? null;
  const likes = likeCount ?? post.likes ?? 0;
  const comments = commentCount ?? post.comments ?? 0;
  const likeNum = typeof likes === "string" ? likes : String(likes);
  const commentNum = typeof comments === "number" ? comments : Number(comments) || 0;

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(post.id);
  };

  const handleComment = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onComment) onComment(post.id);
    else if (href) window.location.href = `${href}#comments`;
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("게시글을 삭제하시겠습니까?")) onDelete?.(post.id);
  };

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(post.id);
  };

  const cardContent = (
    <Surface variant="card" className={"overflow-hidden p-8 relative " + (className || "")}>
      {isMembershipOnly && (
        <span className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-violet-500/25 text-violet-300 text-[10px] font-black uppercase tracking-widest border border-violet-400/30">
          멤버십
        </span>
      )}
      {/* 작성자 헤더 — 잠금 여부 관계없이 항상 표시 */}
      <div className="flex items-center gap-4 mb-6">
        <img src={post.authorAvatar} className="size-12 rounded-full border border-white/[0.08] shrink-0" alt="" />
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-white flex items-center gap-1.5 leading-none">
            {gradeName && (
              <span className="text-amber-300/90 text-sm font-bold shrink-0">[{gradeName}]</span>
            )}
            {displayName}
            {showVerified && (
              <span className="material-symbols-outlined text-violet-300 text-lg fill-icon shrink-0" aria-hidden>verified</span>
            )}
          </h4>
          <p className="text-[10px] text-white/55 font-bold uppercase tracking-widest mt-1">{post.timestamp}</p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={handleEdit}
            className="size-7 flex items-center justify-center rounded-full text-white/25 hover:text-violet-300 hover:bg-violet-300/10 transition-colors shrink-0"
            aria-label="게시글 수정"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="size-7 flex items-center justify-center rounded-full text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
            aria-label="게시글 삭제"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        )}
      </div>

      {isLocked ? (
        /* 잠금 UI */
        <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="material-symbols-outlined text-5xl text-white/25 fill-icon">lock</span>
          <p className="text-white/60 text-sm font-semibold">프리미엄 멤버십 전용 콘텐츠</p>
          <p className="text-white/40 text-xs">멤버십에 가입하면 모든 콘텐츠를 즐길 수 있습니다</p>
        </div>
      ) : (
        <>
          <p className="text-white/80 text-lg leading-relaxed mb-6 font-normal whitespace-pre-wrap">{post.content}</p>
          {post.image && (
            <img src={post.image} className="rounded-2xl w-full border border-white/[0.06] object-cover max-h-80" alt="" />
          )}
          <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleLike}
              className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-red-400 focus:text-red-400 focus:outline-none transition-colors"
              aria-pressed={isLiked}
              aria-label={isLiked ? "좋아요 취소" : "좋아요"}
            >
              <span className={"material-symbols-outlined text-xl " + (isLiked ? "fill-icon text-red-400/90" : "")}>favorite</span>
              <span>{likeNum}</span>
            </button>
            {showCommentButton && (
            <button
              type="button"
              onClick={handleComment}
              className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-violet-300 focus:text-violet-300 focus:outline-none transition-colors"
              aria-label="댓글"
            >
              <span className="material-symbols-outlined text-xl">chat_bubble_outline</span>
              <span>{commentNum}</span>
            </button>
            )}
          </div>
        </>
      )}
    </Surface>
  );

  // 잠긴 포스트는 링크 비활성화
  if (href && !isLocked) {
    return <Link href={href} className="block hover:opacity-[0.98] transition-opacity">{cardContent}</Link>;
  }
  return cardContent;
}
