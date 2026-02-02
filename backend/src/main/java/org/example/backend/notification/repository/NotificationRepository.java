package org.example.backend.notification.repository;

import org.example.backend.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByReceiverIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);
    List<Notification> findByReceiverIdOrderByCreatedAtDesc(Long userId);
}
