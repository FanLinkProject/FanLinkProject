package org.example.backend.notification.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.notification.entity.NotificationType;


@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationSendRequest {
    private Long receiverId;
    private Long senderId;
    private NotificationType type;
    private String content;
}
