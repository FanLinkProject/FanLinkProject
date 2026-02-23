package org.example.backend.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.integration.AfterShipService;
import org.example.backend.global.integration.DeliveryTracker;
import org.example.backend.global.integration.FakeDeliveryTracker;
import org.example.backend.global.integration.SweetTrackerService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeliveryTrackerResolver {

    private final FakeDeliveryTracker fakeDeliveryTracker;
    private final SweetTrackerService sweetTrackerService;
    private final AfterShipService afterShipService;

    @Value("${delivery.mock-enabled:true}")
    private boolean mockEnabled;

    public DeliveryTracker resolve(String countryCode, String courierCode) {
        String normalizedCourierCode = normalizeCourierCode(courierCode);
        if (normalizedCourierCode == null) {
            return null;
        }

        // 개발/테스트 전용 모드에서 명시 코드(TEST)만 허용
        if (mockEnabled && fakeDeliveryTracker.isSupported(normalizedCourierCode)) {
            log.debug("Tracker resolved to FakeDeliveryTracker. courierCode={}", normalizedCourierCode);
            return fakeDeliveryTracker;
        }

        Route route = resolveRoute(countryCode, normalizedCourierCode);
        if (route == Route.DOMESTIC) {
            if (sweetTrackerService.isSupported(normalizedCourierCode)) {
                log.debug("Tracker resolved to SweetTrackerService. countryCode={}, courierCode={}",
                        countryCode, normalizedCourierCode);
                return sweetTrackerService;
            }
            return null;
        }

        if (afterShipService.isSupported(normalizedCourierCode)) {
            log.debug("Tracker resolved to AfterShipService. countryCode={}, courierCode={}",
                    countryCode, normalizedCourierCode);
            return afterShipService;
        }
        return null;
    }

    private Route resolveRoute(String countryCode, String courierCode) {
        String normalizedCountryCode = normalizeCountryCode(countryCode);
        if (normalizedCountryCode != null) {
            return "KR".equals(normalizedCountryCode) ? Route.DOMESTIC : Route.INTERNATIONAL;
        }

        // legacy safety: 과거 데이터(country 누락)에 대해서만 courier 패턴으로 최소 추론
        if (courierCode.matches("\\d+")) {
            return Route.DOMESTIC;
        }
        return Route.INTERNATIONAL;
    }

    private String normalizeCourierCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeCountryCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase();
    }

    private enum Route {
        DOMESTIC,
        INTERNATIONAL
    }
}
