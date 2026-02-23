package org.example.backend.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.delivery.dto.DeliveryResponseDto;
import org.example.backend.delivery.dto.DeliveryStatusHistoryResponseDto;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.delivery.entity.DeliveryStatusHistory;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.example.backend.delivery.exception.DeliveryErrorCode;
import org.example.backend.delivery.exception.DeliveryException;
import org.example.backend.delivery.repository.DeliveryRepository;
import org.example.backend.delivery.repository.DeliveryStatusHistoryRepository;
import org.example.backend.global.integration.DeliveryTracker;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.entity.NotificationType;
import org.example.backend.notification.service.NotificationService;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.product.entity.Product;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.service.ArtistPermissionService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryTrackerResolver deliveryTrackerResolver;
    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private final NotificationService notificationService;
    private final DeliveryMetricsRecorder deliveryMetricsRecorder;
    private final ArtistPermissionService artistPermissionService;

    @Transactional
    public DeliveryResponseDto startShipping(
            Long deliveryId,
            String courierCode,
            String trackingNumber,
            Long operatorUserId,
            UserRole operatorRole
    ) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new DeliveryException(DeliveryErrorCode.DELIVERY_NOT_FOUND));
        authorizeStartShipping(delivery, operatorUserId, operatorRole);

        String normalizedCourierCode = normalizeRequired(courierCode);
        String normalizedTrackingNumber = normalizeRequired(trackingNumber);
        assertTrackingUnique(deliveryId, normalizedCourierCode, normalizedTrackingNumber);

        DeliveryStatus before = delivery.getStatus();
        try {
            delivery.startShipping(normalizedCourierCode, normalizedTrackingNumber);
            recordStatusChange(delivery, before, delivery.getStatus(), "START_SHIPPING");
            deliveryRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new DeliveryException(DeliveryErrorCode.DUPLICATE_TRACKING_INFO);
        }

        return DeliveryResponseDto.from(delivery, "Ready");
    }

    @Transactional
    public DeliveryResponseDto trackDelivery(Long deliveryId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new DeliveryException(DeliveryErrorCode.DELIVERY_NOT_FOUND));

        String currentStatus = "Unknown";

        if (delivery.getTrackingNumber() == null || delivery.getCourierCode() == null) {
            log.warn("Delivery tracking info is missing. deliveryId={}", deliveryId);
            return DeliveryResponseDto.from(delivery, "READY");
        }

        DeliveryTracker tracker = deliveryTrackerResolver.resolve(delivery.getCountry(), delivery.getCourierCode());
        if (tracker == null) {
            log.warn("Unsupported delivery tracker route. countryCode={}, courierCode={}, deliveryId={}",
                    delivery.getCountry(), delivery.getCourierCode(), deliveryId);
            throw new DeliveryException(DeliveryErrorCode.UNSUPPORTED_COURIER_CODE);
        }

        Instant start = Instant.now();
        try {
            currentStatus = tracker.getDeliveryStatus(delivery.getCourierCode(), delivery.getTrackingNumber());
            deliveryMetricsRecorder.recordTrackingApiLatency(
                    tracker.getClass().getSimpleName(),
                    "success",
                    Duration.between(start, Instant.now())
            );

            DeliveryStatus mappedStatus = DeliveryStatus.mapAfterShipStatus(currentStatus);
            DeliveryStatus before = delivery.getStatus();

            if (mappedStatus != null && before != mappedStatus) {
                delivery.updateStatus(mappedStatus);
                recordStatusChange(delivery, before, mappedStatus, "TRACKING_POLLING");
                if (mappedStatus == DeliveryStatus.ISSUE) {
                    notifyDeliveryIssue(delivery, currentStatus);
                }
            }
        } catch (Exception e) {
            deliveryMetricsRecorder.recordTrackingApiLatency(
                    tracker.getClass().getSimpleName(),
                    "error",
                    Duration.between(start, Instant.now())
            );
            deliveryMetricsRecorder.incrementTrackingApiFailed(
                    tracker.getClass().getSimpleName(),
                    e.getClass().getSimpleName()
            );
            log.error("Delivery tracking failed. deliveryId={}, courierCode={}", deliveryId, delivery.getCourierCode(), e);
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

    @Transactional(readOnly = true)
    public List<DeliveryStatusHistoryResponseDto> getStatusHistoryForUser(Long deliveryId, Long userId) {
        deliveryRepository.findByIdAndOrderUserId(deliveryId, userId)
                .orElseThrow(() -> new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED));

        return deliveryStatusHistoryRepository.findByDelivery_IdOrderByCreatedAtAsc(deliveryId).stream()
                .map(DeliveryStatusHistoryResponseDto::from)
                .toList();
    }

    @Transactional
    public void handleAfterShipWebhook(String trackingNumber, String courierCode, String externalStatus) {
        deliveryMetricsRecorder.incrementWebhookReceived("aftership");
        try {
            String normalizedTrackingNumber = normalizeNullable(trackingNumber);
            if (normalizedTrackingNumber == null) {
                throw new DeliveryException(DeliveryErrorCode.INVALID_WEBHOOK_PAYLOAD);
            }

            Delivery delivery = resolveWebhookTargetDelivery(normalizedTrackingNumber, courierCode)
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
            deliveryMetricsRecorder.incrementWebhookProcessed("aftership");
        } catch (RuntimeException e) {
            deliveryMetricsRecorder.incrementWebhookFailed("aftership", e.getClass().getSimpleName());
            throw e;
        }
    }

    private void authorizeStartShipping(Delivery delivery, Long operatorUserId, UserRole operatorRole) {
        if (operatorUserId == null || operatorRole == null) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);
        }
        if (operatorRole == UserRole.ADMIN) {
            return;
        }
        if (operatorRole != UserRole.ARTIST && operatorRole != UserRole.GROUP) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);
        }

        Order order = delivery.getOrder();
        if (order == null || order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);
        }

        Set<Long> shippableArtistIds = new HashSet<>();
        for (OrderItem item : order.getOrderItems()) {
            if (item == null) {
                continue;
            }
            Product product = item.getProduct();
            if (product == null) {
                continue;
            }
            if (product.getArtistId() == null) {
                continue;
            }
            if (Boolean.TRUE.equals(product.getIsMembership())) {
                continue;
            }
            if (product.getConcertId() != null) {
                continue;
            }
            shippableArtistIds.add(product.getArtistId());
        }

        if (shippableArtistIds.isEmpty()) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);
        }

        boolean canManageAll = shippableArtistIds.stream()
                .allMatch(artistId -> artistPermissionService.canManagePage(
                        artistId,
                        operatorUserId,
                        operatorRole,
                        true
                ));
        if (!canManageAll) {
            throw new DeliveryException(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);
        }
    }

    private void recordStatusChange(Delivery delivery, DeliveryStatus from, DeliveryStatus to, String reason) {
        if (from == null || from == to) {
            return;
        }
        DeliveryStatusHistory history = DeliveryStatusHistory.of(delivery, from, to, reason);
        deliveryStatusHistoryRepository.save(history);
        deliveryMetricsRecorder.incrementStatusTransition(from, to, reason);
    }

    private Optional<Delivery> resolveWebhookTargetDelivery(String trackingNumber, String courierCode) {
        String normalizedCourierCode = normalizeNullable(courierCode);
        if (normalizedCourierCode != null) {
            return deliveryRepository.findByTrackingNumberAndCourierCode(trackingNumber, normalizedCourierCode);
        }

        List<Delivery> byTrackingNumber = deliveryRepository.findAllByTrackingNumber(trackingNumber);
        if (byTrackingNumber.size() > 1) {
            throw new DeliveryException(DeliveryErrorCode.INVALID_WEBHOOK_PAYLOAD);
        }
        return byTrackingNumber.stream().findFirst();
    }

    private void assertTrackingUnique(Long deliveryId, String courierCode, String trackingNumber) {
        deliveryRepository.findByTrackingNumberAndCourierCode(trackingNumber, courierCode)
                .ifPresent(existing -> {
                    if (!existing.getId().equals(deliveryId)) {
                        throw new DeliveryException(DeliveryErrorCode.DUPLICATE_TRACKING_INFO);
                    }
                });
    }

    private String normalizeRequired(String value) {
        String normalized = normalizeNullable(value);
        if (normalized == null) {
            throw new DeliveryException(DeliveryErrorCode.INVALID_TRACKING_NUMBER);
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
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
                "Order '%s' has a delivery issue. Current status: %s",
                delivery.getOrder().getName(),
                trackingStatus
        );

        NotificationSendRequest request = NotificationSendRequest.builder()
                .receiverId(receiverId)
                .senderId(receiverId)
                .type(NotificationType.DELIVERY_ISSUE)
                .content(content)
                .build();

        notificationService.sendNotification(request);
    }
}
