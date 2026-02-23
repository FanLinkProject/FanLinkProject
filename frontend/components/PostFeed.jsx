"use client";

import PostCard from "@/components/PostCard";

/**
 * 게시물 리스트. 동일한 PostCard 스타일로 렌더링.
 * posts: 배열
 * postLinkBase: '/posts' 이면 각 카드 링크는 /posts/{id}
 * showVerified: 아티스트 글일 때 인증 뱃지 (type === 'ARTIST')
 * isLikedMap, onLike, onComment: 선택적
 */
export default function PostFeed({
  posts,
  postLinkBase = "/posts",
  postLinkQuery,
  showVerifiedByType = true,
  isLikedMap = {},
  onLike,
  onComment,
  likeCountMap = {},
  commentCountMap = {},
  isLockedMap = {},
  onDelete,
  canDeleteSet,
  onEdit,
  canEditSet,
  className = "",
}) {
  if (!posts?.length) return null;
  return (
    <div className={`space-y-6 ${className}`}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          href={postLinkBase ? `${postLinkBase}/${post.id}${postLinkQuery ? `?${postLinkQuery}` : ""}` : undefined}
          showVerified={showVerifiedByType && post.type === "ARTIST"}
          isLiked={isLikedMap[post.id]}
          onLike={onLike}
          likeCount={likeCountMap[post.id] ?? undefined}
          commentCount={post.isNotice ? undefined : (commentCountMap[post.id] ?? undefined)}
          onComment={post.isNotice ? undefined : onComment}
          showCommentButton={!post.isNotice}
          isLocked={isLockedMap[post.id] ?? false}
          onDelete={onDelete && canDeleteSet?.has(post.id) ? onDelete : undefined}
          onEdit={onEdit && canEditSet?.has(post.id) ? onEdit : undefined}
        />
      ))}
    </div>
  );
}
