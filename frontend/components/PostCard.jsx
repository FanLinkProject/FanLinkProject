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
    <Surface variant="card" className={"overflow-hidden flex flex-col relative " + (className || "")}>
      {post.image && !isLocked && (
        <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
          <img src={post.image} className="w-full h-full object-cover" alt="" />
          {post.attachmentCount > 1 && (
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-bold">
              +{post.attachmentCount - 1}
            </span>
          )}
          {isMembershipOnly && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-violet-500/80 text-white text-[10px] font-black uppercase tracking-widest">
              멤버십
            </span>
          )}
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        {isMembershipOnly && (!post.image || isLocked) && (
          <span className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-violet-500/25 text-violet-300 text-[10px] font-black uppercase tracking-widest border border-violet-400/30">
            멤버십
          </span>
        )}

        <div className="flex items-center gap-3 mb-4">
          <img src={post.authorAvatar} className="size-9 rounded-full border border-white/[0.08] shrink-0 object-cover" alt="" />
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-white text-sm flex items-center gap-1 leading-none truncate">
              {gradeName && (
                <span className="text-amber-300/90 text-xs font-bold shrink-0">[{gradeName}]</span>
              )}
              {displayName}
              {showVerified && (
                <span className="material-symbols-outlined text-violet-300 text-sm fill-icon shrink-0" aria-hidden>verified</span>
              )}
            </h4>
            <p className="text-[9px] text-white/50 font-bold uppercase tracking-widest mt-0.5">{post.timestamp}</p>
          </div>
          {onEdit && (
            <button type="button" onClick={handleEdit} className="size-6 flex items-center justify-center rounded-full text-white/25 hover:text-violet-300 hover:bg-violet-300/10 transition-colors shrink-0" aria-label="수정">
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={handleDelete} className="size-6 flex items-center justify-center rounded-full text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0" aria-label="삭제">
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          )}
        </div>

        {isLocked ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex-1">
            <span className="material-symbols-outlined text-4xl text-white/25 fill-icon">lock</span>
            <p className="text-white/60 text-xs font-semibold">멤버십 전용 콘텐츠</p>
          </div>
        ) : (
          <>
            <p className="text-white/80 text-sm leading-relaxed line-clamp-3 whitespace-pre-wrap flex-1">{post.content}</p>
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleLike}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-red-400 transition-colors"
                aria-pressed={isLiked}
                aria-label={isLiked ? "좋아요 취소" : "좋아요"}
              >
                <span className={"material-symbols-outlined text-lg " + (isLiked ? "fill-icon text-red-400/90" : "")}>favorite</span>
                <span>{likeNum}</span>
              </button>
              {showCommentButton && (
                <button
                  type="button"
                  onClick={handleComment}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-violet-300 transition-colors"
                  aria-label="댓글"
                >
                  <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                  <span>{commentNum}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Surface>
  );

  // 잠긴 포스트는 링크 비활성화
  if (href && !isLocked) {
    return <Link href={href} className="block hover:opacity-[0.98] transition-opacity">{cardContent}</Link>;
  }
  return cardContent;
}
