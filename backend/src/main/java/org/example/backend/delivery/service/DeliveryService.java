package org.example.backend.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.delivery.dto.DeliveryResponseDto;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.delivery.entity.DeliveryStatusHistory;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.example.backend.delivery.exception.DeliveryErrorCode;
import org.example.backend.delivery.exception.DeliveryException;
import org.example.backend.delivery.repository.DeliveryRepository;
import org.example.backend.delivery.repository.DeliveryStatusHistoryRepository;
import org.example.backend.global.integration.AfterShipService;
import org.example.backend.global.integration.DeliveryTracker;
import org.example.backend.global.integration.FakeDeliveryTracker;
import org.example.backend.global.integration.SweetTrackerService;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.entity.NotificationType;
import org.example.backend.notification.service.NotificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

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

    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private final NotificationService notificationService;

    @Value("${delivery.mock-enabled:true}")
    private boolean mockEnabled;

    /**
     * [관리자] 배송 시작 (송장 번호 입력)
     */
    @Transactional
    public DeliveryResponseDto startShipping(Long deliveryId, String courierCode, String trackingNumber) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new DeliveryException(DeliveryErrorCode.DELIVERY_NOT_FOUND));

        DeliveryStatus before = delivery.getStatus();
        delivery.startShipping(courierCode, trackingNumber);

        // 상태 이력 기록
        recordStatusChange(delivery, before, delivery.getStatus(), "START_SHIPPING");

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

            // 외부 상태를 내부 DeliveryStatus 로 매핑
            DeliveryStatus mappedStatus = DeliveryStatus.mapAfterShipStatus(currentStatus);
            DeliveryStatus before = delivery.getStatus();

            if (mappedStatus != null && before != mappedStatus) {
                delivery.updateStatus(mappedStatus);
                recordStatusChange(delivery, before, mappedStatus, "TRACKING_POLLING");

                // 배송 이슈 발생 시 알림 발송
                if (mappedStatus == DeliveryStatus.ISSUE) {
                    notifyDeliveryIssue(delivery, currentStatus);
                }
            }
        } catch (Exception e) {
            log.error("배송 추적 조회 중 오류 발생. deliveryId={}, courierCode={}", 
                    deliveryId, delivery.getCourierCode(), e);
            currentStatus = "ERROR";
        }

        return DeliveryResponseDto.from(delivery, currentStatus);
    }

    @Transactional
    public DeliveryResponseDto trackDeliveryForUser(Long deliveryId, Long userId) {
        Delivery delivery = deliveryRepository.findByIdAndOrderUserId(deliveryId, userId)
                .orElseThrow(() -> new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED));
        return trackDelivery(delivery.getId());
    }

    @Transactional
    public void handleAfterShipWebhook(String trackingNumber, String courierCode, String externalStatus) {
        if (trackingNumber == null || trackingNumber.isBlank()) {
            throw new DeliveryException(DeliveryErrorCode.INVALID_WEBHOOK_PAYLOAD);
        }

        Delivery delivery = resolveWebhookTargetDelivery(trackingNumber, courierCode)
                .orElseThrow(() -> new DeliveryException(DeliveryErrorCode.DELIVERY_NOT_FOUND));

        DeliveryStatus mapped = DeliveryStatus.mapAfterShipStatus(externalStatus);
        DeliveryStatus before = delivery.getStatus();
        if (before != mapped) {
            delivery.updateStatus(mapped);
            recordStatusChange(delivery, before, mapped, "AFTERSHIP_WEBHOOK");
            if (mapped == DeliveryStatus.ISSUE) {
                notifyDeliveryIssue(delivery, externalStatus);
            }
        }
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

    private void recordStatusChange(Delivery delivery, DeliveryStatus from, DeliveryStatus to, String reason) {
        if (from == null || from == to) {
            return;
        }
        DeliveryStatusHistory history = DeliveryStatusHistory.of(delivery, from, to, reason);
        deliveryStatusHistoryRepository.save(history);
    }

    private Optional<Delivery> resolveWebhookTargetDelivery(String trackingNumber, String courierCode) {
        if (courierCode != null && !courierCode.isBlank()) {
            Optional<Delivery> byTrackingAndCourier =
                    deliveryRepository.findByTrackingNumberAndCourierCode(trackingNumber, courierCode);
            if (byTrackingAndCourier.isPresent()) {
                return byTrackingAndCourier;
            }
        }
        return deliveryRepository.findByTrackingNumber(trackingNumber);
    }

    private void notifyDeliveryIssue(Delivery delivery, String trackingStatus) {
        if (delivery.getOrder() == null) {
            return;
        }
        Long receiverId = delivery.getOrder().getUserId();
        if (receiverId == null) {
            return;
        }

        String content = String.format(
                "주문 '%s' 의 배송에 이슈가 발생했습니다. 현재 상태: %s",
                delivery.getOrder().getName(),
                trackingStatus
        );

        NotificationSendRequest request = NotificationSendRequest.builder()
                .receiverId(receiverId)
                .senderId(receiverId) // 별도 시스템 유저가 없어서 수신자 기준으로 설정
                .type(NotificationType.DELIVERY_ISSUE)
                .content(content)
                .build();

        notificationService.sendNotification(request);
    }
}
