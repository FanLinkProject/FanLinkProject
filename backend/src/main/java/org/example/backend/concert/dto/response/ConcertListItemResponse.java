package org.example.backend.concert.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.concert.entity.Concert;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

/**
 * 목록/지도 공통 응답 DTO. 다가오는 공연만 사용.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConcertListItemResponse {

    private Long concertId;
    private String title;
    private Instant startDateTime;
    private Instant endDateTime;
    private String placeName;
    private String fullAddress;
    private String concertImageUrl;
    private List<String> artistNames;
    private Double latitude;
    private Double longitude;
    private Long locationId;
    private Instant presaleStartDateTime;
    private Instant presaleEndDateTime;
    private Instant saleStartDateTime;
    private Instant saleEndDateTime;

    public static ConcertListItemResponse of(
            Concert concert,
            String concertImageUrl,
            List<String> artistNames
    ) {
        String placeName = concert.getVenueName();
        String fullAddress = null;
        Double latitude = null;
        Double longitude = null;
        Long locationId = null;
        if (concert.getLocation() != null) {
            placeName = concert.getLocation().getPlaceName() != null
                    ? concert.getLocation().getPlaceName()
                    : concert.getVenueName();
            fullAddress = concert.getLocation().getFullAddress();
            latitude = concert.getLocation().getLatitude();
            longitude = concert.getLocation().getLongitude();
            locationId = concert.getLocation().getId();
        }
        return ConcertListItemResponse.builder()
                .concertId(concert.getId())
                .title(concert.getTitle())
                .startDateTime(concert.getStartDateTime())
                .endDateTime(concert.getEndDateTime())
                .placeName(placeName)
                .fullAddress(fullAddress)
                .concertImageUrl(concertImageUrl)
                .artistNames(artistNames != null ? artistNames : Collections.emptyList())
                .latitude(latitude)
                .longitude(longitude)
                .locationId(locationId)
                .presaleStartDateTime(concert.getPresaleStartDateTime())
                .presaleEndDateTime(concert.getPresaleEndDateTime())
                .saleStartDateTime(concert.getSaleStartDateTime())
                .saleEndDateTime(concert.getSaleEndDateTime())
                .build();
    }
}
