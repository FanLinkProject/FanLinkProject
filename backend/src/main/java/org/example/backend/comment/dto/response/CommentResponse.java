package org.example.backend.comment.dto.response;

import org.example.backend.comment.entity.Comment;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;

import java.time.Instant;

public record CommentResponse(
        Long id,
        Long userId,
        String nickname,
        String profileImageUrl,
        String role,            // USER, ARTIST, GROUP, ADMIN
        boolean isArtist,       // 아티스트 댓글 강조용
        String content,
        Boolean status,
        Instant createdAt,
        int replyCount,
        boolean hasReplies,
        boolean hasArtistReply  // 부모 댓글에 아티스트 답글 존재 여부
) {
    private static String resolveNickname(User user) {
        return user != null ? user.getNickname() : "알 수 없는 사용자";
    }

    private static boolean checkArtist(User user) {
        return user != null && (user.getRole() == UserRole.ARTIST || user.getRole() == UserRole.GROUP);
    }

    /**
     * 부모 댓글 전용 팩토리 메서드
     * - @Formula(activeReplyCount)를 활용하여 children 컬렉션 로딩을 회피
     * - 삭제된 댓글은 "삭제된 댓글입니다." 문구로 대체
     * - hasArtistReply: 서비스에서 일괄 조회한 Set에 포함 여부로 판별
     */
    public static CommentResponse of(Comment entity, User user, boolean hasArtistReply) {
        String displayContent = Boolean.TRUE.equals(entity.getStatus()) ? "삭제된 댓글입니다." : entity.getContent();

        return new CommentResponse(
                entity.getId(),
                entity.getUserId(),
                resolveNickname(user),
                user != null ? user.getProfileImageUrl() : null,
                user != null ? user.getRole().name() : null,
                checkArtist(user),
                displayContent,
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getActiveReplyCount(),
                entity.getActiveReplyCount() > 0,
                hasArtistReply
        );
    }

    /**
     * 대댓글 전용 팩토리 메서드
     * - 대댓글에는 자식이 없으므로 replyCount = 0, hasArtistReply = false 고정
     */
    public static CommentResponse ofReply(Comment entity, User user) {
        return new CommentResponse(
                entity.getId(),
                entity.getUserId(),
                resolveNickname(user),
                user != null ? user.getProfileImageUrl() : null,
                user != null ? user.getRole().name() : null,
                checkArtist(user),
                entity.getContent(),
                entity.getStatus(),
                entity.getCreatedAt(),
                0,
                false,
                false
        );
    }
}