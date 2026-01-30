package org.example.backend.order.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.order.dto.request.OrderItemDto;
import org.example.backend.order.dto.request.OrderRequestDto;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.product.entity.Product;
import org.example.backend.product.repository.ProductRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

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

    /**
     * 인증된 사용자의 요청으로 주문을 생성합니다.
     */
    @Transactional
    public String createOrder(Long userId, OrderRequestDto request) {
        Order order = Order.builder()
                .userId(userId)
                .name(request.name())
                .totalAmount(BigDecimal.valueOf(request.totalAmount()))
                .totalCandyAmount(request.totalCandyAmount() != null ? request.totalCandyAmount() : 0L)
                .status(OrderStatus.PENDING) // 초기 상태 PENDING
                .orderNo(java.util.UUID.randomUUID().toString())
                .build();

        for (OrderItemDto itemDto : request.orderItems()) {
            Product product = productRepository.findById(itemDto.productId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다: " + itemDto.productId()));

            // 가격 정책: 상품의 현재 가격 사용 (변동 가능성 고려하여 스냅샷 저장)
            BigDecimal savedPrice = BigDecimal.valueOf(product.getPrice());
            Long savedCandyPrice = product.getCandyPrice();

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(itemDto.quantity())
                    .price(savedPrice)
                    .candyPrice(savedCandyPrice)
                    .build();

            order.addOrderItem(orderItem);
        }

        orderRepository.save(order);
        return order.getOrderNo();
    }
}
