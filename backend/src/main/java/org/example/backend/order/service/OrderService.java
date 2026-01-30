package org.example.backend.order.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.entity.Order;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;

    /**
     * 테스트를 위한 PENDING 상태의 주문 번호를 조회합니다.
     * 실제 운영 환경에서는 사용되지 않으며, 결제 테스트 시 유효한 orderNo를 제공하기 위함입니다.
     *
     * @return 테스트용 주문 번호 (PENDING 상태)
     * @throws IllegalArgumentException 테스트 데이터가 없을 경우
     * @throws IllegalStateException    주문이 이미 결제 완료된 경우
     */
    public String getTestPendingOrderNo() {
        // PENDING 상태의 첫 번째 주문 조회 (테스트용)
        Order order = orderRepository.findById(3L)
                .orElseThrow(() -> new IllegalArgumentException("테스트 주문이 존재하지 않습니다. SQL 스크립트를 먼저 실행해주세요."));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException("주문이 이미 처리되었습니다.");
        }

        return order.getOrderNo();
    }
}
