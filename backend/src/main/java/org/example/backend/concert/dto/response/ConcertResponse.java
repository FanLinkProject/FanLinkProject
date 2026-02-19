package org.example.backend.concert.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.concert.entity.Concert;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConcertResponse {
    private Long id;
    private String title;
    private String description;
    private Instant startDateTime;
    private Instant endDateTime;
    private String timezone;
    private String venueName;
    private LocationResponse location;
    private String posterImageUrl;
    private List<ConcertMediaAssetResponse> mediaAssets;
    private Integer presaleTicketCount;
    private Integer saleTicketCount;
    private Instant presaleStartDateTime;
    private Instant presaleEndDateTime;
    private Instant saleStartDateTime;
    private Instant saleEndDateTime;
    private Instant createdAt;
    private Instant updatedAt;
    private List<ArtistResponse> artists;

    public static ConcertResponse from(Concert concert, String posterImageUrl, List<ConcertMediaAssetResponse> mediaAssets) {
        return ConcertResponse.builder()
                .id(concert.getId())
                .title(concert.getTitle())
                .description(concert.getDescription())
                .startDateTime(concert.getStartDateTime())
                .endDateTime(concert.getEndDateTime())
                .timezone(concert.getTimezone())
                .venueName(concert.getVenueName())
                .location(concert.getLocation() != null
                        ? LocationResponse.from(concert.getLocation())
                        : null)
                .posterImageUrl(posterImageUrl)
                .mediaAssets(mediaAssets != null ? mediaAssets : Collections.emptyList())
                .presaleTicketCount(concert.getPresaleTicketCount())
                .saleTicketCount(concert.getSaleTicketCount())
                .presaleStartDateTime(concert.getPresaleStartDateTime())
                .presaleEndDateTime(concert.getPresaleEndDateTime())
                .saleStartDateTime(concert.getSaleStartDateTime())
                .saleEndDateTime(concert.getSaleEndDateTime())
                .createdAt(concert.getCreatedAt())
                .updatedAt(concert.getUpdatedAt())
                .artists(concert.getArtists() == null
                        ? Collections.emptyList()
                        : concert.getArtists().stream()
                                .map(ca -> ArtistResponse.from(ca.getArtist()))
                                .collect(Collectors.toList()))
                .build();
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LocationResponse {
        private Long id;
        private String country;
        private String state;
        private String city;
        private String district;
        private String street;
        private String zipcode;
        private Double latitude;
        private Double longitude;
        private String fullAddress;

        public static LocationResponse from(org.example.backend.concert.entity.Location location) {
            return LocationResponse.builder()
                    .id(location.getId())
                    .country(location.getCountry())
                    .state(location.getState())
                    .city(location.getCity())
                    .district(location.getDistrict())
                    .street(location.getStreet())
                    .zipcode(location.getZipcode())
                    .latitude(location.getLatitude())
                    .longitude(location.getLongitude())
                    .fullAddress(location.getFullAddress())
                    .build();
        }
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ArtistResponse {
        private Long id;
        private String nickname;
        private String name;

        public static ArtistResponse from(org.example.backend.user.entity.User artist) {
            return ArtistResponse.builder()
                    .id(artist.getId())
                    .nickname(artist.getNickname())
                    .name(artist.getName())
                    .build();
        }
    }
}
