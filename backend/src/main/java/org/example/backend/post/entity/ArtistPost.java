package org.example.backend.post.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.user.entity.User;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "artist_posts")
// 아티스트, 관리자가 작성한 게시글
public class ArtistPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private User group; // 아티스트 그룹 (공용 계정)

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, columnDefinition = "TINYINT(1) default 0")
    private Boolean status; // 삭제 여부 (0: false, 1: true)

    @Column(name = "is_membership_only", nullable = false, columnDefinition = "TINYINT(1) default 0")
    private Boolean isMembershipOnly; // 멤버십만 볼 수 있는 게시글 여부 (0: false, 1: true)

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "representative_media_asset_id")
    private Long representativeMediaAssetId;

    @Builder
    public ArtistPost(User user, User group, String title, String content, Boolean status, Boolean isMembershipOnly,
                      Long representativeMediaAssetId) {
        this.user = user;
        this.group = group;
        this.title = title;
        this.content = content;
        this.status = status != null ? status : false;
        this.isMembershipOnly = isMembershipOnly != null ? isMembershipOnly : false;
        this.representativeMediaAssetId = representativeMediaAssetId;
    }

    public void delete() {
        this.status = true;
        this.deletedAt = Instant.now();
    }

    public void update(String title, String content, Boolean isMembershipOnly, Long representativeMediaAssetId) {
        this.title = title;
        this.content = content;
        this.isMembershipOnly = isMembershipOnly != null ? isMembershipOnly : false;
        this.representativeMediaAssetId = representativeMediaAssetId;
    }
}
