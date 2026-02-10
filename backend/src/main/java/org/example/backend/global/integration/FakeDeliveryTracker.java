package org.example.backend.global.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Primary // 가짜서비스 먼저 사용
public class FakeDeliveryTracker implements DeliveryTracker {

    @Override
    public String getDeliveryStatus(String courierCode, String trackingNumber) {
        log.info("[Mock] 배송 조회 요청: 택배사={}, 운송장={}", courierCode, trackingNumber);

        // 테스트를 위한 가짜 로직
        // 운송장 번호의 마지막 자리에 따라 상태를 다르게 줌

        if (trackingNumber == null || trackingNumber.isEmpty()) {
            return "Unknown";
        }

        if (trackingNumber.endsWith("1")) {
            return "Pending";    // 배송 준비
        } else if (trackingNumber.endsWith("2")) {
            return "InTransit";  // 배송 중
        } else if (trackingNumber.endsWith("3")) {
            return "Delivered";  // 배송 완료
        } else if (trackingNumber.endsWith("4")) {
            return "Exception";  // 반품/사고
        }

        // 기본값은 배송 중
        return "InTransit";
    }
}