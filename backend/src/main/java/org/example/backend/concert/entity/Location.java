package org.example.backend.concert.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

/**
 * 공연 장소 위치 정보 엔티티
 *
 * - 외부 지도 Provider(카카오/구글 등) 장소 ID 기반으로 Upsert 가능
 * - 지도 마커/검색에 필요한 최소 좌표/주소 보관
 * - 주소 분해 필드는 MVP에서는 선택값(nullable)로 둠
 */
@Entity
@Table(
	name = "locations",
	uniqueConstraints = {
		@UniqueConstraint(name = "uk_locations_provider_place_id", columnNames = {"provider", "place_id"})
	},
	indexes = {
		@Index(name = "idx_locations_lat_lng", columnList = "latitude, longitude")
	}
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Location {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/**
	 * 지도 Provider (예: KAKAO, GOOGLE 등)
	 * - 확장 대비용
	 */
	@Column(nullable = false, length = 20)
	private String provider;

	/**
	 * Provider가 부여하는 장소 고유 ID
	 * - Upsert 중복 기준
	 */
	@Column(name = "place_id", length = 80)
	private String placeId;

	/**
	 * 장소명(공연장명)
	 */
	@Column(name = "place_name", length = 200)
	private String placeName;

	/**
	 * 전체 주소 문자열 (road_address_name 우선)
	 */
	@Column(nullable = false, length = 500)
	private String fullAddress;

	@Column(nullable = false)
	private Double latitude;

	@Column(nullable = false)
	private Double longitude;

	/**
	 * 주소 분해 정보 (MVP에서는 선택)
	 * - 카카오 검색 결과만으로 안정적으로 못 채울 수 있어서 nullable
	 */
	@Column(length = 100)
	private String country;

	@Column(length = 100)
	private String state;

	@Column(length = 100)
	private String city;

	@Column(length = 100)
	private String district;

	@Column(length = 200)
	private String street;

	@Column(length = 20)
	private String zipcode;

	@CreatedDate
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	/**
	 * 주소/표시용 정보 업데이트 (Upsert 시 기존 레코드 보정용)
	 */
	public void updateDisplayInfo(String placeName, String fullAddress) {
		this.placeName = placeName;
		this.fullAddress = fullAddress;
	}
}
