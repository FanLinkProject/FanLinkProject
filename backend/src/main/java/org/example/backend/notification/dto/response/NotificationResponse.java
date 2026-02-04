package org.example.backend.notification.dto.response;


import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.notification.entity.Notification;
import org.example.backend.notification.entity.NotificationType;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {
    private Long id;
    private String content;
    private NotificationType type;
    /**
     * 프론트는 isRead 필드를 사용.
     * Java boolean getter(isRead) → Jackson 기본 규칙에선 "read"로 직렬화되는 경우가 있어
     * JSON 필드명을 명시적으로 고정한다.
     */
    @JsonProperty("isRead")
    @JsonAlias({"read"})
    private boolean isRead;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .content(n.getContent())
                .type(n.getType())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
