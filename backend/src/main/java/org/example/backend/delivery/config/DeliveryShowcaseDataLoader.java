package org.example.backend.delivery.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.delivery.entity.Delivery;
import org.example.backend.delivery.entity.DeliveryStatusHistory;
import org.example.backend.delivery.enums.DeliveryStatus;
import org.example.backend.delivery.repository.DeliveryStatusHistoryRepository;
import org.example.backend.order.entity.Order;
import org.example.backend.order.entity.OrderItem;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.payment.entity.Payment;
import org.example.backend.payment.enums.PaymentMethod;
import org.example.backend.payment.enums.PaymentStatus;
import org.example.backend.payment.repository.PaymentRepository;
import org.example.backend.product.entity.Product;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.enums.ProductType;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.entity.Follow;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.repository.FollowRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
@Profile({"dev", "local", "default"})
@ConditionalOnProperty(prefix = "app.seed.delivery", name = "enabled", havingValue = "true")
public class DeliveryShowcaseDataLoader implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "Pass!1234";
    private static final String ORDER_PREFIX = "SEED-DELIVERY-";
    private static final long SHIPPING_FEE = 3000L;

    private final UserRepository userRepository;
    private final FollowRepository followRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        User artistAlpha = createUserIfMissing(
                "seed.artist.alpha@fanlink.test",
                "SEED_ARTIST_ALPHA",
                "Seed Artist Alpha",
                "FEMALE",
                "1998-01-01",
                "010-7711-1001",
                UserRole.ARTIST
        );
        User artistBeta = createUserIfMissing(
                "seed.artist.beta@fanlink.test",
                "SEED_ARTIST_BETA",
                "Seed Artist Beta",
                "MALE",
                "1997-02-02",
                "010-7711-1002",
                UserRole.ARTIST
        );

        List<User> fans = createFanUsers();
        ensureFollowRelations(fans, List.of(artistAlpha, artistBeta));

        Product merchAlpha = createProductIfMissing(
                artistAlpha.getId(),
                "SEED MERCH ALPHA T-SHIRT",
                29000L,
                false
        );
        Product merchBeta = createProductIfMissing(
                artistBeta.getId(),
                "SEED MERCH BETA HOODIE",
                49000L,
                false
        );
        Product membershipAlpha = createProductIfMissing(
                artistAlpha.getId(),
                "SEED MEMBERSHIP ALPHA",
                19000L,
                true
        );
        Product membershipBeta = createProductIfMissing(
                artistBeta.getId(),
                "SEED MEMBERSHIP BETA",
                21000L,
                true
        );

        List<OrderPlan> plans = buildOrderPlans(fans, merchAlpha, merchBeta, membershipAlpha, membershipBeta);

        int createdOrders = 0;
        int createdPayments = 0;
        for (OrderPlan plan : plans) {
            if (orderRepository.findByOrderNo(plan.orderNo()).isPresent()) {
                createdPayments += ensurePaymentForExistingOrder(plan.orderNo());
                continue;
            }

            Order savedOrder = createOrder(plan);
            createdOrders++;
            createdPayments += ensurePayment(savedOrder);
        }

        log.info("[DeliveryShowcaseDataLoader] seed users: 10 fans / 2 artists");
        log.info("[DeliveryShowcaseDataLoader] seeded orders created={}, payments created={}", createdOrders, createdPayments);
        log.info("[DeliveryShowcaseDataLoader] fan login sample: seed.fan01@fanlink.test / {}", DEMO_PASSWORD);
        log.info("[DeliveryShowcaseDataLoader] artist login sample: seed.artist.alpha@fanlink.test / {}", DEMO_PASSWORD);
    }

    private List<User> createFanUsers() {
        List<User> fans = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            String email = String.format("seed.fan%02d@fanlink.test", i);
            String nickname = String.format("SEED_FAN_%02d", i);
            String name = String.format("Seed Fan %02d", i);
            String phone = String.format("010-7712-%04d", i);
            fans.add(createUserIfMissing(
                    email,
                    nickname,
                    name,
                    i % 2 == 0 ? "MALE" : "FEMALE",
                    "2000-01-01",
                    phone,
                    UserRole.USER
            ));
        }
        return fans;
    }

    private User createUserIfMissing(
            String email,
            String nickname,
            String name,
            String gender,
            String birth,
            String phone,
            UserRole role
    ) {
        Optional<User> existingOpt = userRepository.findByEmail(email);
        if (existingOpt.isPresent()) {
            User existing = existingOpt.get();
            if (existing.getPassword() == null || existing.getPassword().isBlank()
                    || !passwordEncoder.matches(DEMO_PASSWORD, existing.getPassword())) {
                existing.setPassword(passwordEncoder.encode(DEMO_PASSWORD));
            }
            if (existing.getStatus() != UserStatus.ACTIVE) {
                existing.setStatus(UserStatus.ACTIVE);
            }
            return existing;
        }

        User created = User.of(
                email,
                nickname,
                name,
                passwordEncoder.encode(DEMO_PASSWORD),
                gender,
                birth,
                phone,
                true,
                role
        );
        created.setStatus(UserStatus.ACTIVE);
        return userRepository.save(created);
    }

    private void ensureFollowRelations(List<User> fans, List<User> artists) {
        for (User fan : fans) {
            for (User artist : artists) {
                if (!followRepository.existsByFollowerAndArtist(fan, artist)) {
                    followRepository.save(Follow.of(fan, artist));
                }
            }
        }
    }

    private Product createProductIfMissing(Long artistId, String name, Long price, boolean membership) {
        List<Product> existing = productRepository.findByArtistId(artistId);
        for (Product product : existing) {
            if (name.equals(product.getName())) {
                return product;
            }
        }

        Product product = Product.builder()
                .artistId(artistId)
                .name(name)
                .price(price)
                .candyPrice(0L)
                .type(ProductType.SETTLEMENT_CASH)
                .paymentMethod(ProductPaymentMethod.CASH_ONLY)
                .isSubscription(false)
                .quantity(membership ? 0L : 500L)
                .isMembershipOnly(false)
                .isExclusive(membership)
                .isMembership(membership)
                .representativeMediaAssetId(null)
                .concertId(null)
                .build();
        return productRepository.save(product);
    }

    private List<OrderPlan> buildOrderPlans(
            List<User> fans,
            Product merchAlpha,
            Product merchBeta,
            Product membershipAlpha,
            Product membershipBeta
    ) {
        List<OrderPlan> plans = new ArrayList<>();

        plans.add(new OrderPlan(orderNo(1), fans.get(0), merchAlpha, 1, true, OrderStatus.PENDING, DeliveryStatus.READY));
        plans.add(new OrderPlan(orderNo(2), fans.get(1), merchBeta, 1, true, OrderStatus.COMPLETED, DeliveryStatus.READY));
        plans.add(new OrderPlan(orderNo(3), fans.get(2), merchAlpha, 2, true, OrderStatus.COMPLETED, DeliveryStatus.READY));
        plans.add(new OrderPlan(orderNo(4), fans.get(3), merchBeta, 1, true, OrderStatus.COMPLETED, DeliveryStatus.READY));
        plans.add(new OrderPlan(orderNo(5), fans.get(4), merchAlpha, 1, true, OrderStatus.COMPLETED, DeliveryStatus.SHIPPING));
        plans.add(new OrderPlan(orderNo(6), fans.get(5), merchBeta, 1, true, OrderStatus.COMPLETED, DeliveryStatus.SHIPPING));
        plans.add(new OrderPlan(orderNo(7), fans.get(6), merchAlpha, 3, true, OrderStatus.COMPLETED, DeliveryStatus.SHIPPING));
        plans.add(new OrderPlan(orderNo(8), fans.get(7), merchBeta, 2, true, OrderStatus.COMPLETED, DeliveryStatus.SHIPPING));
        plans.add(new OrderPlan(orderNo(9), fans.get(8), merchAlpha, 1, true, OrderStatus.COMPLETED, DeliveryStatus.DELIVERED));
        plans.add(new OrderPlan(orderNo(10), fans.get(9), merchBeta, 1, true, OrderStatus.COMPLETED, DeliveryStatus.DELIVERED));
        plans.add(new OrderPlan(orderNo(11), fans.get(0), merchAlpha, 2, true, OrderStatus.COMPLETED, DeliveryStatus.DELIVERED));
        plans.add(new OrderPlan(orderNo(12), fans.get(1), merchBeta, 1, true, OrderStatus.COMPLETED, DeliveryStatus.ISSUE));

        plans.add(new OrderPlan(orderNo(13), fans.get(2), membershipAlpha, 1, false, OrderStatus.PENDING, null));
        plans.add(new OrderPlan(orderNo(14), fans.get(3), membershipBeta, 1, false, OrderStatus.COMPLETED, null));
        plans.add(new OrderPlan(orderNo(15), fans.get(4), membershipAlpha, 1, false, OrderStatus.COMPLETED, null));
        plans.add(new OrderPlan(orderNo(16), fans.get(5), membershipBeta, 1, false, OrderStatus.CANCELED, null));
        plans.add(new OrderPlan(orderNo(17), fans.get(6), membershipAlpha, 1, false, OrderStatus.FAILED, null));
        plans.add(new OrderPlan(orderNo(18), fans.get(7), membershipBeta, 1, false, OrderStatus.COMPLETED, null));
        plans.add(new OrderPlan(orderNo(19), fans.get(8), membershipAlpha, 1, false, OrderStatus.PENDING, null));
        plans.add(new OrderPlan(orderNo(20), fans.get(9), membershipBeta, 1, false, OrderStatus.COMPLETED, null));

        return plans;
    }

    private Order createOrder(OrderPlan plan) {
        Delivery delivery = null;
        if (plan.shippable()) {
            delivery = Delivery.createPendingDelivery(
                    plan.buyer().getName(),
                    normalizePhone(plan.buyer().getPhoneNumber()),
                    makeAddress(plan.orderNo()),
                    makeDetailAddress(plan.orderNo()),
                    "KR",
                    makeZipCode(plan.orderNo())
            );
            applyDeliveryStatus(delivery, plan.orderNo(), plan.deliveryStatus());
        }

        BigDecimal unitPrice = BigDecimal.valueOf(plan.product().getPrice() == null ? 0L : plan.product().getPrice());
        BigDecimal totalAmount = unitPrice.multiply(BigDecimal.valueOf(plan.quantity()));
        if (plan.shippable() && totalAmount.compareTo(BigDecimal.ZERO) > 0) {
            totalAmount = totalAmount.add(BigDecimal.valueOf(SHIPPING_FEE));
        }

        Order order = Order.builder()
                .userId(plan.buyer().getId())
                .name(makeOrderName(plan.product().getName(), plan.quantity()))
                .totalAmount(totalAmount)
                .totalCandyAmount(0L)
                .status(plan.orderStatus())
                .orderNo(plan.orderNo())
                .delivery(delivery)
                .build();

        OrderItem orderItem = OrderItem.builder()
                .product(plan.product())
                .quantity(plan.quantity())
                .price(unitPrice)
                .candyPrice(0L)
                .build();
        order.addOrderItem(orderItem);

        Order saved = orderRepository.save(order);
        saveDeliveryHistory(saved.getDelivery(), plan.deliveryStatus());
        return saved;
    }

    private void applyDeliveryStatus(Delivery delivery, String orderNo, DeliveryStatus targetStatus) {
        if (delivery == null || targetStatus == null || targetStatus == DeliveryStatus.READY) {
            return;
        }

        String trackingNumber = makeTrackingNumber(orderNo, targetStatus);
        delivery.startShipping("TEST", trackingNumber);

        if (targetStatus == DeliveryStatus.DELIVERED || targetStatus == DeliveryStatus.ISSUE) {
            delivery.updateStatus(targetStatus);
        }
    }

    private void saveDeliveryHistory(Delivery delivery, DeliveryStatus targetStatus) {
        if (delivery == null || targetStatus == null || targetStatus == DeliveryStatus.READY) {
            return;
        }

        deliveryStatusHistoryRepository.save(
                DeliveryStatusHistory.of(delivery, DeliveryStatus.READY, DeliveryStatus.SHIPPING, "SEED_START_SHIPPING")
        );
        if (targetStatus == DeliveryStatus.DELIVERED || targetStatus == DeliveryStatus.ISSUE) {
            deliveryStatusHistoryRepository.save(
                    DeliveryStatusHistory.of(delivery, DeliveryStatus.SHIPPING, targetStatus, "SEED_TRACKING_UPDATE")
            );
        }
    }

    private int ensurePaymentForExistingOrder(String orderNo) {
        Optional<Order> orderOpt = orderRepository.findByOrderNo(orderNo);
        if (orderOpt.isEmpty()) {
            return 0;
        }
        return ensurePayment(orderOpt.get());
    }

    private int ensurePayment(Order order) {
        if (paymentRepository.findByOrderNo(order.getOrderNo()).isPresent()) {
            return 0;
        }

        PaymentStatus paymentStatus = mapPaymentStatus(order.getStatus());
        Instant paidAt = paymentStatus == PaymentStatus.DONE ? Instant.now() : null;
        Payment payment = Payment.builder()
                .userId(order.getUserId())
                .orderId(order.getId())
                .orderNo(order.getOrderNo())
                .paymentKey("PAY-" + order.getOrderNo())
                .amount(order.getTotalAmount())
                .status(paymentStatus)
                .method(PaymentMethod.CARD)
                .paidAt(paidAt)
                .build();
        paymentRepository.save(payment);
        return 1;
    }

    private PaymentStatus mapPaymentStatus(OrderStatus status) {
        return switch (status) {
            case COMPLETED -> PaymentStatus.DONE;
            case CANCELED -> PaymentStatus.CANCELED;
            case FAILED -> PaymentStatus.FAILED;
            case PENDING -> PaymentStatus.READY;
        };
    }

    private String makeOrderName(String productName, int quantity) {
        if (quantity <= 1) {
            return productName;
        }
        return productName + " and " + (quantity - 1) + " more";
    }

    private String makeAddress(String orderNo) {
        int no = extractOrderIndex(orderNo);
        int streetNo = 110 + no;
        return "Seoul Gangnam-daero " + streetNo;
    }

    private String makeDetailAddress(String orderNo) {
        int no = extractOrderIndex(orderNo);
        return "Building " + (no % 9 + 1) + ", Room " + (200 + no);
    }

    private String makeZipCode(String orderNo) {
        int no = extractOrderIndex(orderNo);
        return String.format("06%03d", no);
    }

    private String makeTrackingNumber(String orderNo, DeliveryStatus status) {
        int suffix = switch (status) {
            case SHIPPING -> 2;
            case DELIVERED -> 3;
            case ISSUE -> 9;
            default -> 1;
        };
        return "TRACK" + orderNo.replace(ORDER_PREFIX, "") + suffix;
    }

    private int extractOrderIndex(String orderNo) {
        String raw = orderNo.replace(ORDER_PREFIX, "");
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String orderNo(int index) {
        return ORDER_PREFIX + String.format("%03d", index);
    }

    private String normalizePhone(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("[^0-9]", "");
    }

    private record OrderPlan(
            String orderNo,
            User buyer,
            Product product,
            int quantity,
            boolean shippable,
            OrderStatus orderStatus,
            DeliveryStatus deliveryStatus
    ) {
    }
}
