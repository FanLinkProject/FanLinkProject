package org.example.backend.music_video.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "artist_music_videos",
        uniqueConstraints = @UniqueConstraint(columnNames = {"artistId", "videoId"})
)
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ArtistMusicVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long artistId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VideoProvider provider;

    @Column(nullable = false, length = 11)
    private String videoId;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(length = 500)
    private String canonicalUrl;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // MV 엔티티 생성에 필요한 값을 세팅한다.
    public ArtistMusicVideo(Long artistId, VideoProvider provider, String videoId, String title, String description, String canonicalUrl) {
        this.artistId = artistId;
        this.provider = provider;
        this.videoId = videoId;
        this.title = title;
        this.description = description;
        this.canonicalUrl = canonicalUrl;
    }
}
