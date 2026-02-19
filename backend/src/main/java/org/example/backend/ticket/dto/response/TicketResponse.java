package org.example.backend.ticket.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.concert.entity.Concert;
import org.example.backend.ticket.entity.Ticket;
import org.example.backend.ticket.entity.TicketStatus;

import java.time.Instant;
import java.time.LocalDateTime;

@Getter
@Builder
public class TicketResponse {
    private Long id;
    private String ticketCode;
    private Long orderId;
    private Long concertId;
    private ConcertSummary concert;
    private TicketStatus status;
    private LocalDateTime issuedAt;
    private LocalDateTime usedAt;
    private LocalDateTime createdAt;

    public static TicketResponse from(Ticket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .ticketCode(ticket.getTicketCode())
                .orderId(ticket.getOrderId())
                .concertId(ticket.getConcertId())
                .concert(null)
                .status(ticket.getStatus())
                .issuedAt(ticket.getIssuedAt())
                .usedAt(ticket.getUsedAt())
                .createdAt(ticket.getCreatedAt())
                .build();
    }

    public static TicketResponse from(Ticket ticket, Concert concert) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .ticketCode(ticket.getTicketCode())
                .orderId(ticket.getOrderId())
                .concertId(ticket.getConcertId())
                .concert(concert != null ? ConcertSummary.from(concert) : null)
                .status(ticket.getStatus())
                .issuedAt(ticket.getIssuedAt())
                .usedAt(ticket.getUsedAt())
                .createdAt(ticket.getCreatedAt())
                .build();
    }

    @Getter
    @Builder
    public static class ConcertSummary {
        private Long id;
        private String title;
        private String venueName;
        private Instant startDateTime;

        public static ConcertSummary from(Concert concert) {
            return ConcertSummary.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .venueName(concert.getVenueName())
                    .startDateTime(concert.getStartDateTime())
                    .build();
        }
    }
}
