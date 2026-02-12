package org.example.backend.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.delivery.dto.DeliveryResponseDto;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.example.backend.delivery.exception.DeliveryErrorCode;
import org.example.backend.delivery.exception.DeliveryException;
import org.example.backend.delivery.repository.DeliveryRepository;
import org.example.backend.global.integration.AfterShipService;
import org.example.backend.global.integration.DeliveryTracker;
import org.example.backend.global.integration.FakeDeliveryTracker;
import org.example.backend.global.integration.SweetTrackerService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;

    // ★핵심★: 모든 트래커 구현체들을 리스트로 주입받습니다. (@Order로 우선순위 정렬됨)
    private final List<DeliveryTracker> deliveryTrackers;

    // 특정 트래커 서비스 (국가별 판단용)
    private final FakeDeliveryTracker fakeDeliveryTracker;
    private final SweetTrackerService sweetTrackerService;
    private final AfterShipService afterShipService;

    @Value("${delivery.mock-enabled:true}")
    private boolean mockEnabled;

    /**
     * [관리자] 배송 시작 (송장 번호 입력)
     */
    @Transactional
    public DeliveryResponseDto startShipping(Long deliveryId, String courierCode, String trackingNumber) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new DeliveryException(DeliveryErrorCode.DELIVERY_NOT_FOUND));

        delivery.startShipping(courierCode, trackingNumber);

        return DeliveryResponseDto.from(delivery, "Ready");
    }

    /**
     * [사용자] 배송 추적 조회
     * 
     * 트래커 선택 우선순위:
     * 1. FakeDeliveryTracker (개발 모드 + courierCode = "TEST")
     * 2. 국가별 트래커 (국내 = SweetTracker, 해외 = AfterShip)
     */
    @Transactional
    public DeliveryResponseDto trackDelivery(Long deliveryId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new DeliveryException(DeliveryErrorCode.DELIVERY_NOT_FOUND));

        String currentStatus = "Unknown";

        if (delivery.getTrackingNumber() == null || delivery.getCourierCode() == null) {
            log.warn("배송 추적 정보가 없습니다. deliveryId={}", deliveryId);
            return DeliveryResponseDto.from(delivery, "READY");
        }

        // ★전략 패턴 적용★: 우선순위에 따라 트래커 선택
        DeliveryTracker tracker = selectTracker(delivery);
        
        if (tracker == null) {
            log.warn("지원하지 않는 택배사 코드입니다. courierCode={}, deliveryId={}", 
                    delivery.getCourierCode(), deliveryId);
            throw new DeliveryException(DeliveryErrorCode.UNSUPPORTED_COURIER_CODE);
        }

        try {
            currentStatus = tracker.getDeliveryStatus(delivery.getCourierCode(), delivery.getTrackingNumber());
            
            // 배송 완료 상태 업데이트
            if ("Delivered".equalsIgnoreCase(currentStatus) && delivery.getStatus() != DeliveryStatus.DELIVERED) {
                delivery.updateStatus(DeliveryStatus.DELIVERED);
            }
        } catch (Exception e) {
            log.error("배송 추적 조회 중 오류 발생. deliveryId={}, courierCode={}", 
                    deliveryId, delivery.getCourierCode(), e);
            currentStatus = "ERROR";
        }

        return DeliveryResponseDto.from(delivery, currentStatus);
    }

    /**
     * 배송 정보에 맞는 트래커를 선택합니다.
     * 우선순위: FakeDeliveryTracker > 국가별 트래커 (국내/해외)
     */
    private DeliveryTracker selectTracker(Delivery delivery) {
        String courierCode = delivery.getCourierCode();

        // 1순위: FakeDeliveryTracker (개발 모드)
        if (fakeDeliveryTracker.isSupported(courierCode)) {
            log.debug("FakeDeliveryTracker 선택: courierCode={}", courierCode);
            return fakeDeliveryTracker;
        }

        // 2순위: 국가별 트래커 선택
        if (delivery.isDomestic()) {
            // 국내 배송: SweetTracker
            if (sweetTrackerService.isSupported(courierCode)) {
                log.debug("SweetTrackerService 선택: 국내 배송, courierCode={}", courierCode);
                return sweetTrackerService;
            }
        } else {
            // 해외 배송: AfterShip
            if (afterShipService.isSupported(courierCode)) {
                log.debug("AfterShipService 선택: 해외 배송, courierCode={}", courierCode);
                return afterShipService;
            }
        }

        // 3순위: 기존 로직 (isSupported로만 판단) - 하위 호환성
        return deliveryTrackers.stream()
                .filter(t -> t.isSupported(courierCode))
                .findFirst()
                .orElse(null);
    }
}