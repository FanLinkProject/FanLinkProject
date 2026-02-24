package org.example.backend.order.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.concert.entity.Concert;
import org.example.backend.concert.repository.ConcertRepository;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.order.dto.response.ArtistOrderDeliveryResponseDto;
import org.example.backend.order.dto.request.OrderItemDto;
import org.example.backend.order.dto.request.OrderRequestDto;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.product.entity.Product;
import org.example.backend.product.repository.ProductRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.springframework.transaction.annotation.Transactional;
import org.example.backend.user.repository.UserRepository;
import org.example.backend.order.dto.request.CandyOrderRequestDto;
import org.example.backend.order.exception.OrderErrorCode;
import org.example.backend.order.exception.OrderException;
import org.example.backend.payment.service.PaymentService;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.user.service.ArtistPermissionService;
import org.example.backend.user.repository.FollowRepository;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.springframework.beans.factory.annotation.Value;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

        @Value("${payment.shipping-fee:3000}")
        private long shippingFee;

        private final OrderRepository orderRepository;
        private final ProductRepository productRepository;
        private final ConcertRepository concertRepository;
        private final SubscriptionRepository subscriptionRepository;
        private final UserRepository userRepository;
        private final PaymentService paymentService;
        private final ArtistPermissionService artistPermissionService;
        private final FollowRepository followRepository;
        private final GroupMemberRepository groupMemberRepository;

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

                        // 아티스트 상품: 팔로우 필수
                        validateFollowRequired(user, product);

                        // 콘서트 티켓 상품: 기간·멤버십 검증
                        validateConcertTicketOrder(user, product);

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
                // 배송비/배송지 검증: 배송이 필요한 상품(플랫폼·멤버십·티켓 제외)이 있을 때만 적용
                boolean hasShippableItem = orderItems.stream().anyMatch(item -> {
                        Product p = item.getProduct();
                        return p.getArtistId() != null
                                        && !Boolean.TRUE.equals(p.getIsMembership())
                                        && p.getConcertId() == null;
                });
                if (hasShippableItem) {
                        validateShippingRequest(request);
                }

                // 3. 배송 정보(Delivery) 생성(아직 송장번호 없음)
                Delivery delivery = null;
                if (hasShippableItem) {
                        delivery = Delivery.createPendingDelivery(
                                request.recipientName(),
                                request.recipientPhone(),
                                request.address(),
                                request.detailAddress(),
                                request.countryCode(),
                                request.zipCode()
                        );
                }
                if (calculatedTotalAmount.compareTo(BigDecimal.ZERO) > 0 && hasShippableItem) {
                        calculatedTotalAmount = calculatedTotalAmount.add(BigDecimal.valueOf(shippingFee));
                }

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

        /**
         * 캔디 전용 상품을 캔디로 즉시 구매합니다.
         * 1. 유저 캔디 잔액 확인 및 차감
         * 2. Order 생성 (COMPLETED)
         * 3. Payment 기록 생성
         */
        @Transactional
        public String createCandyOrder(String email, CandyOrderRequestDto request) {
                User user = userRepository.findByEmail(email)
                                .orElseThrow(() -> new OrderException(OrderErrorCode.USER_NOT_FOUND));

                int qty = request.quantity() != null && request.quantity() > 0 ? request.quantity() : 1;
                Product product = productRepository.findByIdForUpdate(request.productId())
                                .orElseThrow(() -> new OrderException(OrderErrorCode.PRODUCT_NOT_FOUND));

                if (product.getPaymentMethod() != ProductPaymentMethod.CANDY_ONLY) {
                        throw new OrderException(OrderErrorCode.PRODUCT_NOT_FOUND);
                }

                validateFollowRequired(user, product);

                Long candyPrice = product.getCandyPrice() != null ? product.getCandyPrice() : 0L;
                if (candyPrice <= 0) {
                        throw new OrderException(OrderErrorCode.PRODUCT_NOT_FOUND);
                }

                long totalCandy = candyPrice * qty;
                user.useCandy(totalCandy);

                product.decreaseStock((long) qty);

                OrderItem orderItem = OrderItem.builder()
                                .product(product)
                                .quantity(qty)
                                .price(java.math.BigDecimal.ZERO)
                                .candyPrice(candyPrice)
                                .build();

                Order order = Order.builder()
                                .userId(user.getId())
                                .name(qty > 1 ? product.getName() + " 외 " + (qty - 1) + "건" : product.getName())
                                .totalAmount(java.math.BigDecimal.ZERO)
                                .totalCandyAmount(totalCandy)
                                .status(OrderStatus.COMPLETED)
                                .orderNo("CANDY_" + java.util.UUID.randomUUID().toString())
                                .build();

                order.addOrderItem(orderItem);
                Order savedOrder = orderRepository.save(order);

                paymentService.createCandyPayment(savedOrder);

                log.info("캔디 상품 구매 완료: userId={}, productId={}, quantity={}", user.getId(), product.getId(), qty);
                return savedOrder.getOrderNo();
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

        @Transactional(readOnly = true)
        public List<ArtistOrderDeliveryResponseDto> getArtistConsoleOrders(Long operatorUserId, UserRole operatorRole) {
                // 그룹 소속 아티스트(멤버)는 주문/배송 콘솔 접근 불가
                if (operatorRole == UserRole.ARTIST
                                && !artistPermissionService.isManageAccount(operatorUserId, operatorRole)) {
                        return List.of();
                }

                return orderRepository.findAllArtistConsoleOrders().stream()
                                .filter(order -> canManageOrder(order, operatorUserId, operatorRole))
                                .map(ArtistOrderDeliveryResponseDto::from)
                                .toList();
        }

        /**
         * 콘서트 티켓 상품 주문 시: 기간 검증, 선예매 시 멤버십 검증.
         * 멤버십은 (1) 해당 아티스트에 대한 활성 구독(Subscription) 또는
         * (2) 해당 아티스트 멤버십 상품의 완료된 주문(일회성 가입)으로 인정.
         */
        private void validateConcertTicketOrder(User user, Product product) {
                if (product.getConcertId() == null) {
                        return;
                }
                Concert concert = concertRepository.findById(product.getConcertId())
                                .orElseThrow(() -> new OrderException(OrderErrorCode.PRODUCT_NOT_FOUND));

                Instant now = Instant.now();
                boolean isPresaleProduct = Boolean.TRUE.equals(product.getIsMembershipOnly());

                if (isPresaleProduct) {
                        Long artistId = product.getArtistId();
                        boolean hasActiveSubscription = subscriptionRepository.existsActiveSubscriptionForArtist(user.getId(), artistId, now);
                        boolean hasPaidMembershipOrder = orderRepository.existsPaidMembershipOrder(
                                        user.getId(),
                                        artistId,
                                        OrderStatus.COMPLETED,
                                        now.atZone(java.time.ZoneId.systemDefault()).minusMonths(10).toInstant());
                        if (!hasActiveSubscription && !hasPaidMembershipOrder) {
                                throw new OrderException(OrderErrorCode.PRESALE_MEMBERSHIP_REQUIRED);
                        }
                        if (!concert.isPresaleAvailable(now)) {
                                throw new OrderException(OrderErrorCode.PRESALE_PERIOD_NOT_AVAILABLE);
                        }
                } else {
                        if (!concert.isSaleAvailable(now)) {
                                throw new OrderException(OrderErrorCode.SALE_PERIOD_NOT_AVAILABLE);
                        }
                }
        }

        private void validateFollowRequired(User user, Product product) {
                if (product.getArtistId() == null) {
                        return; // 플랫폼 상품(캔디 충전 등)은 팔로우 불필요
                }
                User artist = userRepository.findById(product.getArtistId()).orElse(null);
                if (artist == null) {
                        return;
                }
                if (followRepository.existsByFollowerAndArtist(user, artist)) {
                        return; // 아티스트(멤버) 팔로우 시 구매 가능
                }
                // 소속 멤버 상품: 그룹 팔로우 시에도 구매 가능
                var groupMembership = groupMemberRepository.findByMember(artist).orElse(null);
                if (groupMembership != null && groupMembership.getGroup() != null
                                && followRepository.existsByFollowerAndArtist(user, groupMembership.getGroup())) {
                        return;
                }
                throw new OrderException(OrderErrorCode.FOLLOW_REQUIRED);
        }

        private void validateShippingRequest(OrderRequestDto request) {
                if (isBlank(request.recipientName())
                                || isBlank(request.recipientPhone())
                                || isBlank(request.address())
                                || isBlank(request.detailAddress())
                                || isBlank(request.zipCode())) {
                        throw new OrderException(OrderErrorCode.INVALID_SHIPPING_ADDRESS);
                }

                String countryCode = request.countryCode();
                if (isBlank(countryCode) || countryCode.length() != 2
                                || !Character.isUpperCase(countryCode.charAt(0))
                                || !Character.isUpperCase(countryCode.charAt(1))
                                || !Character.isLetter(countryCode.charAt(0))
                                || !Character.isLetter(countryCode.charAt(1))) {
                        throw new OrderException(OrderErrorCode.INVALID_COUNTRY_CODE);
                }
        }

        private boolean isBlank(String value) {
                return value == null || value.isBlank();
        }

        private boolean canManageOrder(Order order, Long operatorUserId, UserRole operatorRole) {
                if (operatorRole == UserRole.ADMIN) {
                        return true;
                }
                if (operatorUserId == null || operatorRole == null) {
                        return false;
                }
                if (operatorRole != UserRole.ARTIST && operatorRole != UserRole.GROUP) {
                        return false;
                }

                Set<Long> manageableArtistIds = resolveManageableArtistIds(order);
                if (manageableArtistIds.isEmpty()) {
                        return false;
                }

                return manageableArtistIds.stream()
                                .allMatch(artistId -> artistPermissionService.canManagePage(
                                                artistId,
                                                operatorUserId,
                                                operatorRole,
                                                true));
        }

        private Set<Long> resolveManageableArtistIds(Order order) {
                Set<Long> ids = new HashSet<>();
                if (order == null || order.getOrderItems() == null) {
                        return ids;
                }

                for (OrderItem item : order.getOrderItems()) {
                        if (item == null) {
                                continue;
                        }
                        Product product = item.getProduct();
                        if (product == null || product.getArtistId() == null) {
                                continue;
                        }
                        ids.add(product.getArtistId());
                }
                return ids;
        }
}
