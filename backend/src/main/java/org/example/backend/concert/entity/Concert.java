package org.example.backend.concert.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 공연 엔티티
 */
@Entity
@Table(name = "concerts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Concert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Instant startDateTime;

    @Column(nullable = false)
    private Instant endDateTime;

    @Column(nullable = false, length = 50)
    private String timezone;

    @Column(nullable = false, length = 200)
    private String venueName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @OneToMany(mappedBy = "concert", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ConcertMediaAsset> mediaAssets = new ArrayList<>();

    @Column(nullable = false)
    @Builder.Default
    private Integer presaleTicketCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer saleTicketCount = 0;

    @Column(nullable = false)
    private Instant presaleStartDateTime;

    @Column(nullable = false)
    private Instant presaleEndDateTime;

    @Column(nullable = false)
    private Instant saleStartDateTime;

    @Column(nullable = false)
    private Instant saleEndDateTime;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "concert", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ConcertArtist> artists = new ArrayList<>();

    /**
     * 공연 정보 업데이트
     */
    public void updateInfo(
            String title,
            String description,
            Instant startDateTime,
            Instant endDateTime,
            String timezone,
            String venueName
    ) {
        this.title = title;
        this.description = description;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.timezone = timezone;
        this.venueName = venueName;
    }

    public void addMediaAsset(ConcertMediaAsset concertMediaAsset) {
        this.mediaAssets.add(concertMediaAsset);
        concertMediaAsset.setConcert(this);
    }

    public void removeMediaAsset(ConcertMediaAsset concertMediaAsset) {
        this.mediaAssets.remove(concertMediaAsset);
        concertMediaAsset.setConcert(null);
    }

    /**
     * 티켓 판매 정보 업데이트
     */
    public void updateTicketInfo(
            Integer presaleTicketCount,
            Integer saleTicketCount,
            Instant presaleStartDateTime,
            Instant presaleEndDateTime,
            Instant saleStartDateTime,
            Instant saleEndDateTime
    ) {
        this.presaleTicketCount = presaleTicketCount;
        this.saleTicketCount = saleTicketCount;
        this.presaleStartDateTime = presaleStartDateTime;
        this.presaleEndDateTime = presaleEndDateTime;
        this.saleStartDateTime = saleStartDateTime;
        this.saleEndDateTime = saleEndDateTime;
    }

    /**
     * 위치 정보 업데이트
     */
    public void updateLocation(Location location) {
        this.location = location;
    }

    /**
     * 아티스트 추가
     */
    public void addArtist(ConcertArtist concertArtist) {
        this.artists.add(concertArtist);
        concertArtist.setConcert(this);
    }

    /**
     * 아티스트 제거
     */
    public void removeArtist(ConcertArtist concertArtist) {
        this.artists.remove(concertArtist);
        concertArtist.setConcert(null);
    }

    /**
     * 현재 시점에서 선예매 가능 여부 확인
     */
    public boolean isPresaleAvailable(Instant now) {
        return now.isAfter(presaleStartDateTime) && now.isBefore(presaleEndDateTime);
    }

    /**
     * 현재 시점에서 일반 예매 가능 여부 확인
     */
    public boolean isSaleAvailable(Instant now) {
        return now.isAfter(saleStartDateTime) && now.isBefore(saleEndDateTime);
    }

    /**
     * 공연 시작 여부 확인
     */
    public boolean isStarted(Instant now) {
        return now.isAfter(startDateTime);
    }

    /**
     * 공연 종료 여부 확인
     */
    public boolean isEnded(Instant now) {
        return now.isAfter(endDateTime);
    }
}
