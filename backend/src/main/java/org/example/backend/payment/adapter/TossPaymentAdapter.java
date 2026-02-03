package org.example.backend.payment.adapter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.payment.config.TossPaymentConfig;
import org.example.backend.payment.dto.TossPaymentDto;
import org.example.backend.payment.exception.PaymentErrorCode;
import org.example.backend.payment.exception.PaymentException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class TossPaymentAdapter implements PaymentAdapter {

    private final RestTemplate restTemplate;
    private final TossPaymentConfig tossPaymentConfig;

    private HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBasicAuth(tossPaymentConfig.getSecretKey(), ""); // Spring automatically encodes "key:"
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        return headers;
    }

    /**
     * Toss Payments API에 결제 승인을 요청합니다.
     * 프론트엔드에서 성공적으로 결제 인증을 마친 후 호출됩니다.
     */
    @Override
    public TossPaymentDto.PaymentConfirmResponse confirmPayment(String paymentKey, String orderId, Long amount) {
        String url = tossPaymentConfig.getBaseUrl() + "/payments/confirm";

        TossPaymentDto.PaymentConfirmRequest request = TossPaymentDto.PaymentConfirmRequest.builder()
                .paymentKey(paymentKey)
                .orderId(orderId)
                .amount(amount)
                .build();

        try {
            HttpEntity<TossPaymentDto.PaymentConfirmRequest> entity = new HttpEntity<>(request, getHeaders());
            return restTemplate.postForObject(url, entity, TossPaymentDto.PaymentConfirmResponse.class);
        } catch (Exception e) {
            log.error("Toss 결제 승인 실패: {}", e.getMessage());
            throw new PaymentException(PaymentErrorCode.PAYMENT_CONFIRM_FAILED);
        }
    }

    /**
     * Toss Payments API에 빌링키 발급을 요청합니다.
     * 카드 정보를 등록하고 나중에 자동 결제를 수행하기 위해 사용됩니다.
     */
    @Override
    public TossPaymentDto.BillingKeyResponse issueBillingKey(String authKey, String customerKey) {
        String url = tossPaymentConfig.getBaseUrl() + "/billing/authorizations/issue";

        TossPaymentDto.BillingKeyRequest request = TossPaymentDto.BillingKeyRequest.builder()
                .authKey(authKey)
                .customerKey(customerKey)
                .build();

        HttpEntity<TossPaymentDto.BillingKeyRequest> entity = new HttpEntity<>(request, getHeaders());

        return restTemplate.postForObject(url, entity, TossPaymentDto.BillingKeyResponse.class);
    }

    /**
     * 발급받은 빌링키를 사용하여 결제 승인을 요청합니다.
     * 정기 결제(구독) 시 스케줄러에 의해 호출됩니다.
     */
    @Override
    public TossPaymentDto.PaymentConfirmResponse billingPayment(String billingKey, String customerKey, Long amount,
            String orderId, String orderName) {
        String url = tossPaymentConfig.getBaseUrl() + "/billing/" + billingKey;

        TossPaymentDto.BillingPaymentRequest request = TossPaymentDto.BillingPaymentRequest.builder()
                .customerKey(customerKey)
                .amount(amount)
                .orderId(orderId)
                .orderName(orderName)
                .build();

        HttpEntity<TossPaymentDto.BillingPaymentRequest> entity = new HttpEntity<>(request, getHeaders());

        return restTemplate.postForObject(url, entity, TossPaymentDto.PaymentConfirmResponse.class);
    }

    /**
     * 주문 번호로 결제 정보를 조회합니다.
     * (Pending 주문 정리 스케줄러에서 사용)
     */
    public TossPaymentDto.PaymentConfirmResponse getPaymentByOrderNo(String orderNo) {
        String url = tossPaymentConfig.getBaseUrl() + "/payments/orders/" + orderNo;
        try {
            HttpEntity<?> entity = new HttpEntity<>(getHeaders());
            return restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity,
                    TossPaymentDto.PaymentConfirmResponse.class).getBody();
        } catch (Exception e) {
            log.warn("Toss 결제 조회 실패 (orderNo={}): {}", orderNo, e.getMessage());
            return null; // 조회 실패 시 null 반환 (404 등)
        }
    }
}
