package org.example.backend.comment.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.example.backend.post.entity.Post;
import org.example.backend.post.enums.WriterType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "comments")
@SQLDelete(sql = "UPDATE comments SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
@EntityListeners(AuditingEntityListener.class)
public class Comment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 댓글은 무조건 게시글에 종속되므로 객체 참조 (FK 생성됨)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    // 작성자 정보 (User or Artist)
    @Column(name = "writer_id", nullable = false)
    private Long writerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "writer_type", nullable = false)
    private WriterType writerType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 대댓글 (Self Reference)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    @OneToMany(mappedBy = "parent", orphanRemoval = false)
    private List<Comment> children = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Soft delete를 위한 삭제 시간 기록
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public Comment(Post post, Long writerId, WriterType writerType, String content, Comment parent) {
        this.post = post;
        this.writerId = writerId;
        this.writerType = writerType;
        this.content = content;
        this.parent = parent;
    }

    public void updateContent(String content) {
        this.content = content;
    }

    public void delete() {
        this.deletedAt = LocalDateTime.now(); // 삭제 시간 기록
    }
}