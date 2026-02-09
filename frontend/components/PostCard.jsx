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
  className = "",
}) {
  const displayName = post.authorMemberName ?? post.authorName ?? "";
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

  const cardContent = (
    <Surface variant="card" className={"overflow-hidden p-8 " + (className || "")}>
      <div className="flex items-center gap-4 mb-6">
        <img src={post.authorAvatar} className="size-12 rounded-full border border-white/[0.08] shrink-0" alt="" />
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-white flex items-center gap-1.5 leading-none">
            {displayName}
            {showVerified && (
              <span className="material-symbols-outlined text-violet-300 text-lg fill-icon shrink-0" aria-hidden>verified</span>
            )}
          </h4>
          <p className="text-[10px] text-white/55 font-bold uppercase tracking-widest mt-1">{post.timestamp}</p>
        </div>
      </div>
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
        <button
          type="button"
          onClick={handleComment}
          className="inline-flex items-center gap-2 text-sm font-bold text-white/70 hover:text-violet-300 focus:text-violet-300 focus:outline-none transition-colors"
          aria-label="댓글"
        >
          <span className="material-symbols-outlined text-xl">chat_bubble_outline</span>
          <span>{commentNum}</span>
        </button>
      </div>
    </Surface>
  );

  if (href) {
    return <Link href={href} className="block hover:opacity-[0.98] transition-opacity">{cardContent}</Link>;
  }
  return cardContent;
}
