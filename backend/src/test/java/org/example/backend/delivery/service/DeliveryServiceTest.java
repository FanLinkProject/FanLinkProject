package org.example.backend.delivery.service;

import org.example.backend.delivery.dto.DeliveryStatusHistoryResponseDto;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.delivery.entity.DeliveryStatusHistory;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.example.backend.delivery.exception.DeliveryErrorCode;
import org.example.backend.delivery.exception.DeliveryException;
import org.example.backend.delivery.repository.DeliveryRepository;
import org.example.backend.delivery.repository.DeliveryStatusHistoryRepository;
import org.example.backend.notification.service.NotificationService;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.product.entity.Product;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.service.ArtistPermissionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeliveryServiceTest {

    @Mock
    private DeliveryRepository deliveryRepository;
    @Mock
    private DeliveryTrackerResolver deliveryTrackerResolver;
    @Mock
    private DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private DeliveryMetricsRecorder deliveryMetricsRecorder;
    @Mock
    private ArtistPermissionService artistPermissionService;

    @InjectMocks
    private DeliveryService deliveryService;

    @Test
    @DisplayName("운송장 등록 시 courier+tracking 조합이 다른 배송건에 이미 있으면 충돌 예외를 던진다")
    void startShipping_throwsConflict_whenDuplicateTrackingExists() {
        Delivery delivery = org.mockito.Mockito.mock(Delivery.class);
        Delivery existing = org.mockito.Mockito.mock(Delivery.class);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(deliveryRepository.findByTrackingNumberAndCourierCode("123456", "cj"))
                .thenReturn(Optional.of(existing));
        when(existing.getId()).thenReturn(99L);

        assertThatThrownBy(() -> deliveryService.startShipping(10L, "cj", "123456", 1L, UserRole.ADMIN))
                .isInstanceOf(DeliveryException.class)
                .extracting(ex -> ((DeliveryException) ex).getErrorCode())
                .isEqualTo(DeliveryErrorCode.DUPLICATE_TRACKING_INFO);

        verify(delivery, never()).startShipping(anyString(), anyString());
    }

    @Test
    @DisplayName("상태 이력 조회는 소유권 검증 후 DTO 목록을 반환한다")
    void getStatusHistoryForUser_returnsHistoryDtos_whenAuthorized() {
        Delivery delivery = org.mockito.Mockito.mock(Delivery.class);
        DeliveryStatusHistory history = DeliveryStatusHistory.of(
                delivery, DeliveryStatus.READY, DeliveryStatus.SHIPPING, "START_SHIPPING");

        when(deliveryRepository.findByIdAndOrderUserId(1L, 2L)).thenReturn(Optional.of(delivery));
        when(deliveryStatusHistoryRepository.findByDelivery_IdOrderByCreatedAtAsc(1L))
                .thenReturn(List.of(history));

        List<DeliveryStatusHistoryResponseDto> result = deliveryService.getStatusHistoryForUser(1L, 2L);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().fromStatus()).isEqualTo("READY");
        assertThat(result.getFirst().toStatus()).isEqualTo("SHIPPING");
        assertThat(result.getFirst().reason()).isEqualTo("START_SHIPPING");
    }

    @Test
    @DisplayName("웹훅 payload가 잘못되면 실패 지표를 기록하고 예외를 던진다")
    void handleAfterShipWebhook_recordsFailureMetric_whenPayloadInvalid() {
        assertThatThrownBy(() -> deliveryService.handleAfterShipWebhook(" ", "dhl", "InTransit"))
                .isInstanceOf(DeliveryException.class)
                .extracting(ex -> ((DeliveryException) ex).getErrorCode())
                .isEqualTo(DeliveryErrorCode.INVALID_WEBHOOK_PAYLOAD);

        verify(deliveryMetricsRecorder).incrementWebhookReceived("aftership");
        verify(deliveryMetricsRecorder).incrementWebhookFailed("aftership", "DeliveryException");
    }

    @Test
    @DisplayName("ARTIST/GROUP가 배송 대상 상품을 관리할 수 없으면 배송 시작을 거부한다")
    void startShipping_throwsAccessDenied_whenOperatorCannotManageArtists() {
        Delivery delivery = org.mockito.Mockito.mock(Delivery.class);
        Order order = org.mockito.Mockito.mock(Order.class);
        OrderItem item = org.mockito.Mockito.mock(OrderItem.class);
        Product product = org.mockito.Mockito.mock(Product.class);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(delivery.getOrder()).thenReturn(order);
        when(order.getOrderItems()).thenReturn(List.of(item));
        when(item.getProduct()).thenReturn(product);
        when(product.getArtistId()).thenReturn(100L);
        when(product.getIsMembership()).thenReturn(false);
        when(product.getConcertId()).thenReturn(null);
        when(artistPermissionService.canManagePage(100L, 20L, UserRole.ARTIST, true)).thenReturn(false);

        assertThatThrownBy(() -> deliveryService.startShipping(10L, "04", "123456", 20L, UserRole.ARTIST))
                .isInstanceOf(DeliveryException.class)
                .extracting(ex -> ((DeliveryException) ex).getErrorCode())
                .isEqualTo(DeliveryErrorCode.DELIVERY_ACCESS_DENIED);

        verify(delivery, never()).startShipping(anyString(), anyString());
    }

    @Test
    @DisplayName("Webhook에서 courier가 없고 tracking이 중복되면 잘못된 payload로 처리한다")
    void handleAfterShipWebhook_throwsInvalidPayload_whenTrackingIsAmbiguous() {
        Delivery d1 = org.mockito.Mockito.mock(Delivery.class);
        Delivery d2 = org.mockito.Mockito.mock(Delivery.class);
        when(deliveryRepository.findAllByTrackingNumber("123456")).thenReturn(List.of(d1, d2));

        assertThatThrownBy(() -> deliveryService.handleAfterShipWebhook("123456", null, "InTransit"))
                .isInstanceOf(DeliveryException.class)
                .extracting(ex -> ((DeliveryException) ex).getErrorCode())
                .isEqualTo(DeliveryErrorCode.INVALID_WEBHOOK_PAYLOAD);

        verify(deliveryMetricsRecorder).incrementWebhookReceived("aftership");
        verify(deliveryMetricsRecorder).incrementWebhookFailed("aftership", "DeliveryException");
    }

    @Test
    @DisplayName("Webhook에 courier가 있으면 tracking 단독 fallback 없이 courier+tracking으로만 찾는다")
    void handleAfterShipWebhook_doesNotFallbackToTrackingOnly_whenCourierProvided() {
        when(deliveryRepository.findByTrackingNumberAndCourierCode("123456", "dhl")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> deliveryService.handleAfterShipWebhook("123456", "dhl", "InTransit"))
                .isInstanceOf(DeliveryException.class)
                .extracting(ex -> ((DeliveryException) ex).getErrorCode())
                .isEqualTo(DeliveryErrorCode.DELIVERY_NOT_FOUND);

        verify(deliveryRepository, never()).findAllByTrackingNumber(anyString());
        verify(deliveryMetricsRecorder).incrementWebhookReceived("aftership");
        verify(deliveryMetricsRecorder).incrementWebhookFailed("aftership", "DeliveryException");
    }
}
