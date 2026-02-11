package org.example.backend.comment.dto.response;

import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.enums.TargetType;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;

import java.time.LocalDateTime;

/**
 * 내가 작성한 댓글 조회 응답 DTO
 * - CommentResponse와 달리 targetType, targetId 정보 포함
 * - 부모 댓글과 대댓글 모두 표현 가능
 */
public record MyCommentResponse(
        Long id,
        Long userId,
        String nickname,
        String profileImageUrl,
        String role,
        boolean isArtist,
        String content,
        Integer status,
        LocalDateTime createdAt,
        TargetType targetType,  // 어떤 게시판 타입인지
        Long targetId,          // 어떤 게시물에 달린 댓글인지
        Long parentId,          // null이면 부모 댓글, 값이 있으면 대댓글
        int replyCount          // 부모 댓글인 경우 대댓글 수
) {
    private static String resolveNickname(User user) {
        return user != null ? user.getNickname() : "알 수 없는 사용자";
    }

    private static boolean checkArtist(User user) {
        return user != null && (user.getRole() == UserRole.ARTIST || user.getRole() == UserRole.GROUP);
    }

    /**
     * Comment 엔티티를 MyCommentResponse로 변환
     * - 부모 댓글과 대댓글 모두 처리 가능
     */
    public static MyCommentResponse of(Comment entity, User user) {
        return new MyCommentResponse(
                entity.getId(),
                entity.getUserId(),
                resolveNickname(user),
                user != null ? user.getProfileImageUrl() : null,
                user != null ? user.getRole().name() : null,
                checkArtist(user),
                entity.getContent(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getTargetType(),
                entity.getTargetId(),
                entity.getParent() != null ? entity.getParent().getId() : null,
                entity.getParent() == null ? entity.getActiveReplyCount() : 0
        );
    }
}
