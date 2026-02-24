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
    private Long posterMediaAssetId;
    private Integer presaleTicketCount;
    private Integer saleTicketCount;
    private Long presaleTicketPrice;   // 선예매 티켓 가격 (원)
    private Long saleTicketPrice;      // 일반 예매 티켓 가격 (원)
    private Instant presaleStartDateTime;
    private Instant presaleEndDateTime;
    private Instant saleStartDateTime;
    private Instant saleEndDateTime;
    private List<Long> artistIds;
}
