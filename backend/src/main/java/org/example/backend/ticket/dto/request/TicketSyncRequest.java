package org.example.backend.ticket.dto.request;

import java.util.List;

public record TicketSyncRequest(
        List<String> ticketCodes
) {
}
