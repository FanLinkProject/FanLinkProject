package org.example.backend.payment.adapter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.payment.config.TossPaymentConfig;
import org.example.backend.payment.dto.TossPaymentDto;
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

    @Override
    public TossPaymentDto.PaymentConfirmResponse confirmPayment(String paymentKey, String orderId, Long amount) {
        String url = tossPaymentConfig.getBaseUrl() + "/payments/confirm";

        TossPaymentDto.PaymentConfirmRequest request = TossPaymentDto.PaymentConfirmRequest.builder()
                .paymentKey(paymentKey)
                .orderId(orderId)
                .amount(amount)
                .build();

        HttpEntity<TossPaymentDto.PaymentConfirmRequest> entity = new HttpEntity<>(request, getHeaders());

        // 실제로는 try-catch로 예외처리 필요 (Toss 에러 응답 파싱 등)
        return restTemplate.postForObject(url, entity, TossPaymentDto.PaymentConfirmResponse.class);
    }

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
}
