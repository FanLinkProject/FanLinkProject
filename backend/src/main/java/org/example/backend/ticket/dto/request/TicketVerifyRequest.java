package org.example.backend.ticket.dto.request;

import jakarta.validation.constraints.NotBlank;

public record TicketVerifyRequest(
        @NotBlank(message = "토큰은 필수입니다.")
        String token
) {
}
