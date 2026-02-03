package org.example.backend.order.repository;

import org.example.backend.order.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.example.backend.order.enums.OrderStatus;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByOrderNo(String orderNo);

    java.util.List<Order> findByStatusAndUpdatedAtBefore(OrderStatus status,
            java.time.LocalDateTime updatedAt);
}
