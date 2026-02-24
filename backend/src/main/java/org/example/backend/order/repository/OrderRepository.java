package org.example.backend.order.repository;

import org.example.backend.order.entity.Order;
import org.example.backend.product.enums.ProductType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.example.backend.order.enums.OrderStatus;
import java.util.Optional;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
        Optional<Order> findByOrderNo(String orderNo);

        java.util.List<Order> findByStatusAndUpdatedAtBefore(OrderStatus status,
                        Instant updatedAt);

        /**
         * 10개월 내 유료 팬 가입 상품 구매 이력 조회.
         * 유료 팬 중복 가입 방지용. OrderService.createOrder에서 membership 상품 주문 시 중복 검증에 사용.
         */
        @Query("SELECT COUNT(o) > 0 FROM Order o JOIN o.orderItems oi JOIN oi.product p "
                        +
                        "WHERE o.userId = :userId AND p.artistId = :artistId " +
                        "AND p.isMembership = true AND o.status = :status " +
                        "AND o.createdAt >= :date")
        boolean existsPaidMembershipOrder(@Param("userId") Long userId,
                        @Param("artistId") Long artistId,
                        @Param("status") OrderStatus status,
                        @Param("date") Instant date);

        // 유저별 주문 목록 조회 (페이징)
        Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

        /**
         * 유저별 주문 목록 조회 (페이징) - 상품 구매 탭용.
         * 모든 주문 항목이 SETTLEMENT_CANDY인 주문은 제외 (캔디 정산 전용 주문은 구매 내역에 미표시).
         */
        @Query(value = """
            SELECT o FROM Order o
            WHERE o.userId = :userId
            AND (
                NOT EXISTS (SELECT 1 FROM OrderItem oi WHERE oi.order = o)
                OR EXISTS (SELECT 1 FROM OrderItem oi WHERE oi.order = o AND oi.product.type <> :excludeType)
            )
            ORDER BY o.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(o) FROM Order o
            WHERE o.userId = :userId
            AND (
                NOT EXISTS (SELECT 1 FROM OrderItem oi WHERE oi.order = o)
                OR EXISTS (SELECT 1 FROM OrderItem oi WHERE oi.order = o AND oi.product.type <> :excludeType)
            )
            """)
        Page<Order> findByUserIdOrderByCreatedAtDescExcludingSettlementCandyOnly(
                @Param("userId") Long userId,
                @Param("excludeType") ProductType excludeType,
                Pageable pageable);

        /**
         * 티켓 발급용 조회. Order + OrderItems + Products를 fetch join으로 한 번에 조회.
         * TicketIssuanceListener가 결제 완료 시 Product.concertId가 있는 상품에 대해 티켓 발급 시 사용.
         * N+1 방지를 위해 fetch join 사용.
         */
        @Query("SELECT o FROM Order o LEFT JOIN FETCH o.orderItems oi LEFT JOIN FETCH oi.product WHERE o.id = :id")
        Optional<Order> findByIdWithOrderItemsAndProducts(@Param("id") Long id);

        @Query("""
                        SELECT DISTINCT o
                        FROM Order o
                        JOIN FETCH o.orderItems oi
                        JOIN FETCH oi.product p
                        LEFT JOIN FETCH o.delivery d
                        WHERE p.artistId IS NOT NULL
                        ORDER BY o.createdAt DESC
                        """)
        List<Order> findAllArtistConsoleOrders();
}
