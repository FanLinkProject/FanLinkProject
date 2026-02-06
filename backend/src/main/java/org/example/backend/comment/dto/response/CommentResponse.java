package org.example.backend.comment.dto.response;

import org.example.backend.comment.entity.Comment;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long userId,
        String nickname,
        String content,
        Integer status,
        LocalDateTime createdAt,
        int replyCount,
        boolean hasReplies
) {
    private static String resolveNickname(String nickname) {
        return nickname != null ? nickname : "알 수 없는 사용자";
    }

    /**
     * 부모 댓글 전용 팩토리 메서드
     * - @Formula(activeReplyCount)를 활용하여 children 컬렉션 로딩을 회피
     * - 삭제된 댓글은 "삭제된 댓글입니다." 문구로 대체
     */
    public static CommentResponse of(Comment entity, String nickname) {
        String displayContent = (entity.getStatus() == 0) ? "삭제된 댓글입니다." : entity.getContent();

        return new CommentResponse(
                entity.getId(),
                entity.getUserId(),
                resolveNickname(nickname),
                displayContent,
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getActiveReplyCount(),
                entity.getActiveReplyCount() > 0
        );
    }

    /**
     * 대댓글 전용 팩토리 메서드
     * - 대댓글에는 자식이 없으므로 replyCount = 0 고정
     */
    public static CommentResponse ofReply(Comment entity, String nickname) {
        return new CommentResponse(
                entity.getId(),
                entity.getUserId(),
                resolveNickname(nickname),
                entity.getContent(),
                entity.getStatus(),
                entity.getCreatedAt(),
                0,
                false
        );
    }
}