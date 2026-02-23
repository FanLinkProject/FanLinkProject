package org.example.backend.user.dto.request;

import jakarta.validation.constraints.NotBlank;

public record OAuthCodeExchangeRequest(
        @NotBlank(message = "code는 필수입니다.")
        String code
) {
}
