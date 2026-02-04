package org.example.backend.notification.repository;

import org.example.backend.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("SELECT n FROM Notification n WHERE n.receiver.id = :userId AND n.isRead = false ORDER BY n.createdAt DESC")
    List<Notification> findByReceiver_IdAndIsReadFalseOrderByCreatedAtDesc(@Param("userId") Long userId);
    
    @Query("SELECT n FROM Notification n WHERE n.receiver.id = :userId ORDER BY n.createdAt DESC")
    List<Notification> findByReceiver_IdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id = :id")
    int markAsRead(@Param("id") Long id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.receiver.id = :userId AND n.isRead = false")
    int markAllAsRead(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Notification n WHERE n.receiver.id = :userId AND n.isRead = true")
    int deleteReadByUserId(@Param("userId") Long userId);
}
