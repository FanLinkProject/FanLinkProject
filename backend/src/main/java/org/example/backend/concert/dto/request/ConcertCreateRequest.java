package org.example.backend.concert.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConcertCreateRequest {
    private String title;
    private String description;
    private Instant startDateTime;
    private Instant endDateTime;
    private String timezone;
    private String venueName;
    private Long locationId;
    private String concertImageUrl;
    private Integer presaleTicketCount;
    private Integer saleTicketCount;
    private Instant presaleStartDateTime;
    private Instant presaleEndDateTime;
    private Instant saleStartDateTime;
    private Instant saleEndDateTime;
    private List<Long> artistIds;
}
