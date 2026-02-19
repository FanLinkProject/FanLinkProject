package org.example.backend.comment.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.comment.enums.TargetType;
import org.example.backend.comment.exception.CommentErrorCode;
import org.example.backend.comment.exception.CommentException;
import org.hibernate.annotations.Formula;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "comments", indexes = {
        @Index(name = "idx_target", columnList = "target_type, target_id"),
        @Index(name = "idx_parent", columnList = "parent_id")
})
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long targetId;

    @Enumerated(EnumType.STRING)
    private TargetType targetType;

    @Column(columnDefinition = "TEXT")
    private String content;

    private Integer status = 1; // 1: 활성, 0: 삭제

    @CreatedDate
    @Column(updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    // 활성 상태인 자식 댓글 수 (DB 서브쿼리로 조회, children 컬렉션 로딩 불필요)
    @Formula("(SELECT COUNT(*) FROM comments c WHERE c.parent_id = id AND c.status = 1)")
    private int activeReplyCount;

    @Builder
    public Comment(Long userId, Long targetId, TargetType targetType, String content, Comment parent) {
        this.userId = userId;
        this.targetId = targetId;
        this.targetType = targetType;
        this.content = content;
        this.parent = parent;
    }

    public void delete() { this.status = 0; }


    public void update(String content) {
        if (this.status == 0) {
            throw new CommentException(CommentErrorCode.COMMENT_NOT_FOUND); // 이미 삭제된 댓글은 수정 불가
        }
        this.content = content;
    }
}
