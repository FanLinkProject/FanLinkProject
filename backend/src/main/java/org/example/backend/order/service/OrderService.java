package org.example.backend.order.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.delivery.entity.Delivery;
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
         * 인증된 사용자의 요청으로 주문을 생성합니다.
         * 1. 사용자 조회 (email)
         * 2. 상품 조회, 총액 계산, OrderItem 생성
         * 3. Order 생성 및 관계 설정
         * 4. 저장
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
                        // PESSIMISTIC_WRITE 락으로 동시 구매 시 재고 정합성 보장 (race condition 방지)
                        Product product = productRepository.findByIdForUpdate(itemDto.productId())
                                        .orElseThrow(() -> new OrderException(OrderErrorCode.PRODUCT_NOT_FOUND));

                        // 유료 팬 가입 상품 중복 구매 방지: 10개월 내 동일 아티스트 membership 상품 재구매 차단
                        if (Boolean.TRUE.equals(product.getIsMembership())) {
                                boolean exists = orderRepository.existsPaidMembershipOrder(
                                                user.getId(),
                                                product.getArtistId(),
                                                OrderStatus.COMPLETED,
                                                java.time.Instant.now().atZone(java.time.ZoneId.systemDefault()).minusMonths(10).toInstant());
                                if (exists) {
                                        throw new OrderException(OrderErrorCode.DUPLICATE_MEMBERSHIP_ORDER);
                                }
                        }

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
                // 3. 배송 정보(Delivery) 생성(변경/추가)
                // 변경추가 이유: 주문 시 입력받은 주소 정보로 배송 엔티티를 먼저 만듭니다. (아직 송장번호 없음)
                // 주의: OrderRequestDto에 recipientName, address, detailAddress 등의 필드가 추가되어야 합니다.
                Delivery delivery = Delivery.createPendingDelivery(
                        request.recipientName(),  // DTO에 추가 필요
                        request.recipientPhone(), // DTO에 추가 필요
                        request.address(),        // DTO에 추가 필요
                        request.detailAddress()   // DTO에 추가 필요
                );

                // 4. Order 생성
                Order order = Order.builder()
                                .userId(user.getId())
                                .name(request.name())
                                .totalAmount(calculatedTotalAmount)
                                .totalCandyAmount(calculatedTotalCandyAmount)
                                .status(OrderStatus.PENDING)
                                .orderNo(java.util.UUID.randomUUID().toString())
                                .delivery(delivery) // 배송정보연결
                                .build();

                // 5. 관계 설정 (Order <-> OrderItem)
                for (OrderItem item : orderItems) {
                        order.addOrderItem(item);
                }

                // 6. 저장
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
