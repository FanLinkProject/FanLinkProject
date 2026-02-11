package org.example.backend.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.user.entity.User;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;


@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne
    private User receiver;   // 알림 받을 사람

    @ManyToOne
    private User sender;     // 알림을 발생시킨 사람

    @Enumerated(EnumType.STRING)
    private NotificationType type;

    private String content;  // 메시지 내용

    @Builder.Default
    private boolean isRead = false;

    @CreationTimestamp
    private Instant createdAt;


    public void markAsRead() {
        this.isRead = true;
    }
}

