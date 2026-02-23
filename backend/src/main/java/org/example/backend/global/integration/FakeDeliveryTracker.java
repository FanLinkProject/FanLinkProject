package org.example.backend.global.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Order(1) // 최우선 순위: 개발/테스트 모드에서 먼저 체크
public class FakeDeliveryTracker implements DeliveryTracker {

    @Value("${delivery.mock-enabled:true}")
    private boolean mockEnabled;

    @Override
    public boolean isSupported(String courierCode) {
        // 개발 모드가 활성화되어 있고, 택배사 코드가 "TEST"일 때 사용
        return mockEnabled && "TEST".equalsIgnoreCase(courierCode);
    }

    @Override
    public String getDeliveryStatus(String courierCode, String trackingNumber) {
        log.info("[Mock API] 배송 조회 요청: 택배사={}, 운송장={}", courierCode, trackingNumber);

        if (trackingNumber == null) return "UNKNOWN";

        // 테스트 시나리오: 끝자리에 따른 상태 반환
        if (trackingNumber.endsWith("1")) return "Pending";      // 배송 준비
        if (trackingNumber.endsWith("2")) return "InTransit";    // 배송 중
        if (trackingNumber.endsWith("3")) return "Delivered";    // 배송 완료

        return "InTransit"; // 기본값
    }
}