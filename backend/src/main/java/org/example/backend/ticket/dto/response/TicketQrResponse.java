package org.example.backend.ticket.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TicketQrResponse {
    private String qrImageBase64;
    private String token; // JWT (디버깅/스캐너 검증용)
}
