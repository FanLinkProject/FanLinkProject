package org.example.backend.order.repository;

import org.example.backend.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.example.backend.order.enums.OrderStatus;
import java.util.Optional;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<Order, Long> {
        Optional<Order> findByOrderNo(String orderNo);

        java.util.List<Order> findByStatusAndUpdatedAtBefore(OrderStatus status,
                        LocalDateTime updatedAt);

        // 10개월 내 유료 팬 가입 상품 구매 이력 조회
        @Query("SELECT COUNT(o) > 0 FROM Order o JOIN o.orderItems oi JOIN oi.product p "
                        +
                        "WHERE o.userId = :userId AND p.artistId = :artistId " +
                        "AND p.isMembership = true AND o.status = :status " +
                        "AND o.createdAt >= :date")
        boolean existsPaidMembershipOrder(@Param("userId") Long userId,
                        @Param("artistId") Long artistId,
                        @Param("status") OrderStatus status,
                        @Param("date") LocalDateTime date);

        // 유저별 주문 목록 조회 (페이징)
        Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
