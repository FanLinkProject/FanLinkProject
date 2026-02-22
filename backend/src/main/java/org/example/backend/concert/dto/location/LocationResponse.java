package org.example.backend.concert.dto.location;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.concert.entity.Location;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationResponse {

	private Long locationId;
	private String provider;
	private String placeId;
	private String placeName;
	private String fullAddress;
	private Double latitude;
	private Double longitude;

	public static LocationResponse from(Location location) {
		return LocationResponse.builder()
				.locationId(location.getId())
				.provider(location.getProvider())
				.placeId(location.getPlaceId())
				.placeName(location.getPlaceName())
				.fullAddress(location.getFullAddress())
				.latitude(location.getLatitude())
				.longitude(location.getLongitude())
				.build();
	}
}
