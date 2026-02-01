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
        // 1. Order 객체 생성 (일단 금액은 0으로 초기화, 아이템 추가하면서 계산)
        Order order = Order.builder()
                .userId(userId)
                .name(request.name())
                .totalAmount(BigDecimal.ZERO)
                .totalCandyAmount(0L)
                .status(OrderStatus.PENDING) // 초기 상태 PENDING
                .orderNo(java.util.UUID.randomUUID().toString())
                .build();

        BigDecimal calculatedTotalAmount = BigDecimal.ZERO;
        long calculatedTotalCandyAmount = 0L;

        for (OrderItemDto itemDto : request.orderItems()) {
            Product product = productRepository.findById(itemDto.productId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다: " + itemDto.productId()));

            // 가격 정책: 상품의 현재 가격 사용
            BigDecimal itemPrice = BigDecimal.valueOf(product.getPrice());
            Long itemCandyPrice = product.getCandyPrice() != null ? product.getCandyPrice() : 0L;

            // 총액 누적
            calculatedTotalAmount = calculatedTotalAmount
                    .add(itemPrice.multiply(BigDecimal.valueOf(itemDto.quantity())));
            calculatedTotalCandyAmount += itemCandyPrice * itemDto.quantity();

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(itemDto.quantity())
                    .price(itemPrice)
                    .candyPrice(itemCandyPrice)
                    .build();

            order.addOrderItem(orderItem);
        }

        // 2. 계산된 총액으로 Order 업데이트

        java.util.List<OrderItem> orderItems = new java.util.ArrayList<>();
        calculatedTotalAmount = BigDecimal.ZERO;
        calculatedTotalCandyAmount = 0L;

        for (OrderItemDto itemDto : request.orderItems()) {
            Product product = productRepository.findById(itemDto.productId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 상품입니다: " + itemDto.productId()));

            BigDecimal itemPrice = BigDecimal.valueOf(product.getPrice());
            Long itemCandyPrice = product.getCandyPrice() != null ? product.getCandyPrice() : 0L;

            calculatedTotalAmount = calculatedTotalAmount
                    .add(itemPrice.multiply(BigDecimal.valueOf(itemDto.quantity())));
            calculatedTotalCandyAmount += itemCandyPrice * itemDto.quantity();

            // OrderItem 생성
            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .quantity(itemDto.quantity())
                    .price(itemPrice)
                    .candyPrice(itemCandyPrice)
                    .build();
            orderItems.add(orderItem);
        }

        // 2. Order 생성
        order = Order.builder()
                .userId(userId)
                .name(request.name())
                .totalAmount(calculatedTotalAmount)
                .totalCandyAmount(calculatedTotalCandyAmount)
                .status(OrderStatus.PENDING)
                .orderNo(java.util.UUID.randomUUID().toString())
                .build();

        // 3. 관계 설정
        for (OrderItem item : orderItems) {
            order.addOrderItem(item);
        }

        orderRepository.save(order);
        return order.getOrderNo();
    }
}
