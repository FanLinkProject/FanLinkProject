package org.example.backend.order.repository;

import org.example.backend.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.example.backend.order.enums.OrderStatus;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderNo(String orderNo);

    java.util.List<Order> findByStatusAndUpdatedAtBefore(OrderStatus status,
            java.time.LocalDateTime updatedAt);

    // 유저별 주문 목록 조회 (페이징)
    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
