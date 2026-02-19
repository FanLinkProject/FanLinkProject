package org.example.backend.concert.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.user.entity.User;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * 공연-아티스트 M:N 관계 엔티티
 */
@Entity
@Table(
    name = "concert_artists",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"concert_id", "artist_id"})
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ConcertArtist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concert_id", nullable = false)
    private Concert concert;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id", nullable = false)
    private User artist;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Concert 연관관계 설정 (양방향)
     */
    void setConcert(Concert concert) {
        this.concert = concert;
    }
}
