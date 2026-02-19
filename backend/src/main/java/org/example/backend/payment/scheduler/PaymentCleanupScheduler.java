package org.example.backend.payment.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.order.service.OrderService;
import org.example.backend.payment.adapter.TossPaymentAdapter;
import org.example.backend.payment.dto.TossPaymentDto;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentCleanupScheduler {

    private final OrderRepository orderRepository;
    private final TossPaymentAdapter tossPaymentAdapter;
    private final OrderService orderService;

    /**
     * 매 5분마다 실행되어 30분 이상 PENDING 상태인 주문을 정리합니다.
     * (단건 결제 및 구독 결제 모두 포함)
     */
    @Scheduled(fixedDelay = 300000) // 5분
    @Transactional
    public void cleanupPendingOrders() {
        // 30분 이상 지난 PENDING 주문 정리
        Instant cutoffTime = Instant.now().minusSeconds(30 * 60);
        List<Order> pendingOrders = orderRepository.findByStatusAndUpdatedAtBefore(OrderStatus.PENDING, cutoffTime);

        if (pendingOrders.isEmpty()) {
            return;
        }

        log.info("Found {} pending orders older than {}", pendingOrders.size(), cutoffTime);

        for (Order order : pendingOrders) {
            checkAndCancelOrder(order);
        }
    }

    private void checkAndCancelOrder(Order order) {
        try {
            // Toss API로 결제 정보 조회
            TossPaymentDto.PaymentConfirmResponse paymentInfo = tossPaymentAdapter
                    .getPaymentByOrderNo(order.getOrderNo());

            if (paymentInfo == null
                    || "READY".equals(paymentInfo.getStatus())
                    || "ABORTED".equals(paymentInfo.getStatus())
                    || "CANCELED".equals(paymentInfo.getStatus())
                    || "EXPIRED".equals(paymentInfo.getStatus())) {

                // 결제 정보가 없거나, 미완료/취소/만료 상태인 경우 -> 주문 취소 처리
                // READY: 결제창 열림, 인증 전
                // ABORTED: 사용자 취소 (창 닫기 등)
                log.info("Canceling pending order: orderNo={}, status={}", order.getOrderNo(),
                        (paymentInfo != null ? paymentInfo.getStatus() : "NULL"));
                orderService.cancelOrder(order);
            } else {
                // 결제 정보가 존재하고 완료된 상태 (DONE 등)인데 주문이 PENDING인 경우
                // 이는 Toss에서 승인됐으나 우리 서버 로직이 실패을 가능성 -> 로그 남김 (수동 확인 필요)
                log.warn("Payment DONE but order is PENDING. OrderNo: {}, Status: {}", order.getOrderNo(),
                        paymentInfo.getStatus());
            }
        } catch (Exception e) {
            log.error("Error processing pending order cleanup for orderNo={}", order.getOrderNo(), e);
        }
    }
}
