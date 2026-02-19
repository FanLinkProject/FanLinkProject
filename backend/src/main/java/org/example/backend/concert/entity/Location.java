package org.example.backend.concert.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * 공연 장소 위치 정보 엔티티
 */
@Entity
@Table(name = "locations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String country;

    @Column(nullable = false, length = 100)
    private String state;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(length = 100)
    private String district;

    @Column(length = 200)
    private String street;

    @Column(length = 20)
    private String zipcode;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false, length = 500)
    private String fullAddress;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * 전체 주소 업데이트
     */
    public void updateFullAddress(String fullAddress) {
        this.fullAddress = fullAddress;
    }
}
