package org.example.backend.comment.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.comment.enums.TargetType;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "comments", indexes = {
        @Index(name = "idx_target", columnList = "target_type, target_id")
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
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Comment parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL)
    @OrderBy("createdAt ASC")
    private List<Comment> children = new ArrayList<>();

    @Builder
    public Comment(Long userId, Long targetId, TargetType targetType, String content, Comment parent) {
        this.userId = userId;
        this.targetId = targetId;
        this.targetType = targetType;
        this.content = content;
        this.parent = parent;
    }

    public void delete() { this.status = 0; }
}
