package org.example.backend.settlement.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import org.example.backend.settlement.entity.SettlementFailureLog;

import java.time.LocalDateTime;

/**
 * 관리자용 정산 실패 로그 응답 DTO
 * 결제는 성공했으나 정산 대기 데이터 생성에 실패한 건의 정보를 표시합니다.
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminFailureLogResponse {

    private Long id;                  // 실패 로그 ID
    private Long paymentId;           // 결제 ID
    private Long orderId;             // 주문 ID
    private Long userId;              // 결제 유저 ID
    private String orderNo;           // 주문번호
    private String errorMessage;      // 에러 메시지
    private Boolean isProcessed;      // 복구 완료 여부
    private LocalDateTime processedAt;// 복구 완료 시각
    private LocalDateTime createdAt;  // 실패 발생 시각

    public static AdminFailureLogResponse from(SettlementFailureLog entity) {
        return AdminFailureLogResponse.builder()
                .id(entity.getId())
                .paymentId(entity.getPaymentId())
                .orderId(entity.getOrderId())
                .userId(entity.getUserId())
                .orderNo(entity.getOrderNo())
                .errorMessage(entity.getErrorMessage())
                .isProcessed(entity.getIsProcessed())
                .processedAt(entity.getProcessedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

