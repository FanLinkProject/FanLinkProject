package org.example.backend.payment.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * PG사에 종속되지 않는 공통 결제 상태 응답 DTO.
 */
@Getter
@Builder
public class PaymentStatusResponse {
    private String orderNo;
    private String status; // READY, DONE, CANCELED, ABORTED, EXPIRED 등 공통 상태 문자열 혹은 Enum

    public static PaymentStatusResponse of(String orderNo, String status) {
        return PaymentStatusResponse.builder()
                .orderNo(orderNo)
                .status(status)
                .build();
    }
}
