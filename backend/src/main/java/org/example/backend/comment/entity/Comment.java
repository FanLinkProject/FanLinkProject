package org.example.backend.comment.entity;

import org.example.backend.global.entity.BaseTimeEntity;
import org.example.backend.post.entity.Post;
import org.example.backend.post.enums.WriterType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.Where;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "comments")
@SQLDelete(sql = "UPDATE comments SET is_deleted = true WHERE id = ?")
public class Comment extends BaseTimeEntity {

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

    @Column(nullable = false)
    private String content;

    // 대댓글 (Self Reference)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    @OneToMany(mappedBy = "parent", orphanRemoval = false)
    private List<Comment> children = new ArrayList<>();

    // "삭제된 댓글입니다" 표시를 위한 플래그
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted;

    @Builder
    public Comment(Post post, Long writerId, WriterType writerType, String content, Comment parent) {
        this.post = post;
        this.writerId = writerId;
        this.writerType = writerType;
        this.content = content;
        this.parent = parent;
        this.isDeleted = false;
    }

    public void updateContent(String content) {
        this.content = content;
    }

    public void delete() {
        this.isDeleted = true; // 삭제 플래그만 true로 변경
    }
}