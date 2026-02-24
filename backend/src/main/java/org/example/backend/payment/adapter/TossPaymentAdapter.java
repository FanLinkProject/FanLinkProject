package org.example.backend.payment.adapter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.payment.config.TossPaymentConfig;
import org.example.backend.payment.dto.PaymentConfirmResult;
import org.example.backend.payment.dto.PaymentStatusResponse;
import org.example.backend.payment.dto.TossPaymentDto;
import org.example.backend.payment.enums.PaymentMethod;
import org.example.backend.payment.exception.PaymentErrorCode;
import org.example.backend.payment.exception.PaymentException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.OffsetDateTime;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class TossPaymentAdapter implements PaymentAdapter {

    private final RestTemplate restTemplate;
    private final TossPaymentConfig tossPaymentConfig;

    private HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(tossPaymentConfig.getSecretKey(), "");
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }

    @Override
    public PaymentConfirmResult confirmPayment(String paymentKey, String orderId, Long amount) {
        String url = tossPaymentConfig.getBaseUrl() + "/payments/confirm";

        TossPaymentDto.PaymentConfirmRequest request = TossPaymentDto.PaymentConfirmRequest.builder()
                .paymentKey(paymentKey)
                .orderId(orderId)
                .amount(amount)
                .build();

        try {
            HttpEntity<TossPaymentDto.PaymentConfirmRequest> entity = new HttpEntity<>(request, getHeaders());
            TossPaymentDto.PaymentConfirmResponse response = restTemplate.postForObject(url, entity,
                    TossPaymentDto.PaymentConfirmResponse.class);
            return toPaymentConfirmResult(response);
        } catch (Exception e) {
            log.error("결제 승인 실패: {}", e.getMessage());
            throw new PaymentException(PaymentErrorCode.PAYMENT_CONFIRM_FAILED);
        }
    }

    @Override
    public String issueBillingKey(String authKey, String customerKey) {
        String url = tossPaymentConfig.getBaseUrl() + "/billing/authorizations/issue";

        TossPaymentDto.BillingKeyRequest request = TossPaymentDto.BillingKeyRequest.builder()
                .authKey(authKey)
                .customerKey(customerKey)
                .build();

        HttpEntity<TossPaymentDto.BillingKeyRequest> entity = new HttpEntity<>(request, getHeaders());
        TossPaymentDto.BillingKeyResponse response = restTemplate.postForObject(url, entity,
                TossPaymentDto.BillingKeyResponse.class);
        return response != null ? response.getBillingKey() : null;
    }

    @Override
    public PaymentConfirmResult billingPayment(String billingKey, String customerKey, Long amount,
            String orderId, String orderName) {
        String url = tossPaymentConfig.getBaseUrl() + "/billing/" + billingKey;

        TossPaymentDto.BillingPaymentRequest request = TossPaymentDto.BillingPaymentRequest.builder()
                .customerKey(customerKey)
                .amount(amount)
                .orderId(orderId)
                .orderName(orderName)
                .build();

        HttpEntity<TossPaymentDto.BillingPaymentRequest> entity = new HttpEntity<>(request, getHeaders());

        try {
            TossPaymentDto.PaymentConfirmResponse response = restTemplate.postForObject(url, entity,
                    TossPaymentDto.PaymentConfirmResponse.class);
            return toPaymentConfirmResult(response);
        } catch (Exception e) {
            log.error("빌링키 결제 실패: {}", e.getMessage());
            throw new PaymentException(PaymentErrorCode.PAYMENT_CONFIRM_FAILED);
        }
    }

    private PaymentConfirmResult toPaymentConfirmResult(TossPaymentDto.PaymentConfirmResponse r) {
        if (r == null)
            return null;
        return PaymentConfirmResult.builder()
                .paymentKey(r.getPaymentKey())
                .amount(r.getTotalAmount())
                .method(convertTossMethod(r.getMethod()))
                .approvedAt(OffsetDateTime.parse(r.getApprovedAt()).toInstant())
                .build();
    }

    private PaymentMethod convertTossMethod(String tossMethod) {
        return switch (tossMethod != null ? tossMethod : "") {
            case "카드" -> PaymentMethod.CARD;
            case "가상계좌" -> PaymentMethod.VIRTUAL_ACCOUNT;
            case "토스페이" -> PaymentMethod.TOSS_PAY;
            default -> {
                log.warn("알 수 없는 결제 수단: {}", tossMethod);
                yield PaymentMethod.CARD;
            }
        };
    }

    /**
     * 주문 번호로 결제 정보를 조회합니다. (Pending 주문 정리 스케줄러에서 사용)
     */
    @Override
    public PaymentStatusResponse getPaymentStatus(String orderNo) {
        String url = tossPaymentConfig.getBaseUrl() + "/payments/orders/" + orderNo;
        try {
            HttpEntity<?> entity = new HttpEntity<>(getHeaders());
            TossPaymentDto.PaymentConfirmResponse response = restTemplate
                    .exchange(url, org.springframework.http.HttpMethod.GET, entity,
                            TossPaymentDto.PaymentConfirmResponse.class)
                    .getBody();
            if (response != null) {
                return PaymentStatusResponse.of(orderNo, response.getStatus());
            }
            return null;
        } catch (Exception e) {
            log.warn("Toss 결제 조회 실패 (orderNo={}): {}", orderNo, e.getMessage());
            return null; // 조회 실패 시 null 반환 (404 등)
        }
    }
}
