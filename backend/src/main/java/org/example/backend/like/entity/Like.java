package org.example.backend.like.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.like.enums.LikeTarget;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "likes",
    uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_like_user_target",
                columnNames = {"user_id", "target_type", "target_id"}
        )
    },
    indexes = {
        @Index(name = "idx_target", columnList = "target_type, target_id"),
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Like {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId; // User 엔티티 직접 참조 대신 ID만 저장

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LikeTarget targetType; // 좋아요의 대상 FAN_POST, ARTIST_POST, COMMENT

    @Column(nullable = false)
    private Long targetId; // 대상의 PK

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Builder
    public Like(Long userId, LikeTarget targetType, Long targetId) {
        this.userId = userId;
        this.targetType = targetType;
        this.targetId = targetId;
    }
}
