package org.example.backend.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    /*
     * 결제 승인 후 토스 페이먼츠에서 반환하는 응답 데이터입니다.
     * 엔티티 업데이트에 필요한 핵심 필드만 매핑합니다.
     */
    private String paymentKey;
    private String orderId;
    private String orderName;
    private Long totalAmount; // Toss uses totalAmount
    private String status;
    private String method; // methods like '카드', '가상계좌' etc.
    private OffsetDateTime approvedAt; // ISO-8601 string -> OffsetDateTime mapping suggested
    private String type; // NORMAL, BRANDPAY, KEYIN
}
