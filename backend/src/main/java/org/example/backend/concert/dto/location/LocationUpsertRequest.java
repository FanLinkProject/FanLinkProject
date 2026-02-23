package org.example.backend.concert.dto.location;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationUpsertRequest {

	@NotBlank(message = "provider는 필수입니다.")
	@Size(max = 20)
	private String provider;

	@Size(max = 80)
	private String placeId;

	@Size(max = 200)
	private String placeName;

	@NotBlank(message = "fullAddress는 필수입니다.")
	@Size(max = 500)
	private String fullAddress;

	@NotNull(message = "latitude는 필수입니다.")
	@DecimalMin(value = "-90.0", message = "latitude는 -90 ~ 90 사이여야 합니다.")
	@DecimalMax(value = "90.0", message = "latitude는 -90 ~ 90 사이여야 합니다.")
	private Double latitude;

	@NotNull(message = "longitude는 필수입니다.")
	@DecimalMin(value = "-180.0", message = "longitude는 -180 ~ 180 사이여야 합니다.")
	@DecimalMax(value = "180.0", message = "longitude는 -180 ~ 180 사이여야 합니다.")
	private Double longitude;

	@Size(max = 100)
	private String country;

	@Size(max = 100)
	private String state;

	@Size(max = 100)
	private String city;

	@Size(max = 100)
	private String district;

	@Size(max = 200)
	private String street;

	@Size(max = 20)
	private String zipcode;
}
