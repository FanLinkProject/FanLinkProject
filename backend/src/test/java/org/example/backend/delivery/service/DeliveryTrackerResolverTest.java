package org.example.backend.delivery.service;

import org.example.backend.global.integration.AfterShipService;
import org.example.backend.global.integration.DeliveryTracker;
import org.example.backend.global.integration.FakeDeliveryTracker;
import org.example.backend.global.integration.SweetTrackerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeliveryTrackerResolverTest {

    @Mock
    private FakeDeliveryTracker fakeDeliveryTracker;
    @Mock
    private SweetTrackerService sweetTrackerService;
    @Mock
    private AfterShipService afterShipService;

    @InjectMocks
    private DeliveryTrackerResolver resolver;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(resolver, "mockEnabled", true);
    }

    @Test
    @DisplayName("mock 모드 + TEST courierCode면 Fake tracker를 우선 선택한다")
    void resolve_prefersFake_whenMockEnabledAndTestCourier() {
        when(fakeDeliveryTracker.isSupported("TEST")).thenReturn(true);

        DeliveryTracker tracker = resolver.resolve("KR", "TEST");

        assertThat(tracker).isSameAs(fakeDeliveryTracker);
        verify(sweetTrackerService, never()).isSupported(anyString());
        verify(afterShipService, never()).isSupported(anyString());
    }

    @Test
    @DisplayName("국내(KR) 배송은 Sweet tracker만 시도하고 fallback 우회하지 않는다")
    void resolve_domesticWithoutSweetSupport_returnsNull() {
        ReflectionTestUtils.setField(resolver, "mockEnabled", false);
        when(sweetTrackerService.isSupported("04")).thenReturn(false);

        DeliveryTracker tracker = resolver.resolve("KR", "04");

        assertThat(tracker).isNull();
        verify(sweetTrackerService).isSupported("04");
        verify(afterShipService, never()).isSupported(anyString());
    }

    @Test
    @DisplayName("해외(US) 배송은 AfterShip tracker를 선택한다")
    void resolve_international_selectsAfterShip() {
        ReflectionTestUtils.setField(resolver, "mockEnabled", false);
        when(afterShipService.isSupported("dhl")).thenReturn(true);

        DeliveryTracker tracker = resolver.resolve("US", "dhl");

        assertThat(tracker).isSameAs(afterShipService);
        verify(afterShipService).isSupported("dhl");
        verify(sweetTrackerService, never()).isSupported(anyString());
    }
}
