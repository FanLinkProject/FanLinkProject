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
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.example.backend.user.entity.User;
import org.springframework.transaction.annotation.Transactional;
import org.example.backend.user.repository.UserRepository;
import org.example.backend.order.exception.OrderErrorCode;
import org.example.backend.order.exception.OrderException;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

        private final OrderRepository orderRepository;
        private final ProductRepository productRepository;
        private final UserRepository userRepository;

        /**
         * 테스트를 위한 PENDING 상태의 주문 번호를 조회합니다.
         * 실제 운영 환경에서는 사용되지 않으며, 결제 테스트 시 유효한 orderNo를 제공하기 위함입니다.
         *
         * @return 테스트용 주문 번호 (PENDING 상태)
         * @throws OrderException 테스트 데이터가 없을 경우 or 주문이 이미 처리된 경우
         */
        public String getTestPendingOrderNo() {
                // PENDING 상태의 첫 번째 주문 조회 (테스트용)
                Order order = orderRepository.findById(3L)
                                .orElseThrow(() -> new OrderException(OrderErrorCode.TEST_ORDER_NOT_FOUND));

                if (order.getStatus() != OrderStatus.PENDING) {
                        throw new OrderException(OrderErrorCode.ORDER_ALREADY_PROCESSED);
                }

                return order.getOrderNo();
        }

        /**
         * 인증된 사용자의 요청으로 주문을 생성합니다.
         * 
         * 로직 흐름:
         * 1. 사용자 조회 (Email)
         * 2. 상품 조회 및 총액 계산 (DB 가격 기준), OrderItem 목록 생성
         * 3. Order 생성 및 저장
         */
        @Transactional
        public String createOrder(String email, OrderRequestDto request) {
                // 1. 이메일로 사용자 조회
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new OrderException(OrderErrorCode.USER_NOT_FOUND));

                // 2. 상품 조회, 총액 계산, OrderItem 생성
                BigDecimal calculatedTotalAmount = BigDecimal.ZERO;
                long calculatedTotalCandyAmount = 0L;
                List<OrderItem> orderItems = new ArrayList<>();

                for (OrderItemDto itemDto : request.orderItems()) {
                        Product product = productRepository.findById(itemDto.productId())
                                        .orElseThrow(() -> new OrderException(OrderErrorCode.PRODUCT_NOT_FOUND));

                        // 가격 정책: 상품의 현재 가격 사용
                        BigDecimal itemPrice = BigDecimal.valueOf(product.getPrice());
                        Long itemCandyPrice = product.getCandyPrice() != null ? product.getCandyPrice() : 0L;

                        // 총액 누적
                        calculatedTotalAmount = calculatedTotalAmount
                                        .add(itemPrice.multiply(BigDecimal.valueOf(itemDto.quantity())));
                        calculatedTotalCandyAmount += itemCandyPrice * itemDto.quantity();

                        // 재고 차감
                        product.decreaseStock((long) itemDto.quantity());

                        // OrderItem 생성
                        OrderItem orderItem = OrderItem.builder()
                                        .product(product)
                                        .quantity(itemDto.quantity())
                                        .price(itemPrice)
                                        .candyPrice(itemCandyPrice)
                                        .build();

                        orderItems.add(orderItem);
                }

                // 3. Order 생성
                Order order = Order.builder()
                                .userId(user.getId())
                                .name(request.name())
                                .totalAmount(calculatedTotalAmount)
                                .totalCandyAmount(calculatedTotalCandyAmount)
                                .status(OrderStatus.PENDING)
                                .orderNo(java.util.UUID.randomUUID().toString())
                                .build();

                // 4. 관계 설정 (Order <-> OrderItem)
                for (OrderItem item : orderItems) {
                        order.addOrderItem(item);
                }

                // 5. 저장
                orderRepository.save(order);
                return order.getOrderNo();
        }

        @Transactional
        public void cancelOrder(Order order) {
                if (order.getStatus() == OrderStatus.CANCELED) {
                        return;
                }

                // 재고 복구
                for (OrderItem item : order.getOrderItems()) {
                        Product product = item.getProduct();
                        product.increaseStock((long) item.getQuantity());
                }

                order.updateStatus(OrderStatus.CANCELED);
        }
}
