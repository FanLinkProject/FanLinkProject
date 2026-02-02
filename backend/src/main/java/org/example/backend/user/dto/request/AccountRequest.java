package org.example.backend.user.dto.request;

import jakarta.validation.constraints.NotBlank;

// 계좌 정보 요청
public record AccountRequest(
        @NotBlank(message = "은행명을 입력하세요.")
        String bankName,

        @NotBlank(message = "계좌번호를 입력하세요.")
        String accountNumber,

        @NotBlank(message = "예금주명을 입력하세요.")
        String holderName
) {
}
