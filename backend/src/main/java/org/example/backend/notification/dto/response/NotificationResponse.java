package org.example.backend.notification.dto.response;

/**
 * 알림 응답 DTO.
 * 시간 필드(createdAt)는 Instant(ISO-8601 UTC)로 노출되며, 프론트엔드에서 브라우저 timezone으로 현지화.
 */
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.notification.entity.Notification;
import org.example.backend.notification.entity.NotificationType;

import java.time.Instant;

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
    /** ISO-8601 UTC. 프론트엔드에서 브라우저 timezone으로 현지화. */
    private Instant createdAt;
    /** DM 알림 시 해당 아티스트 roomId. ARTIST_MESSAGE, FAN_MESSAGE에서만 사용. */
    private Long roomId;
    /** 알림 클릭 시 이동할 대상 ID (예: LIVE_STARTED → liveSessionId) */
    private Long targetId;

    public static NotificationResponse from(Notification n) {
        return from(n, null);
    }

    public static NotificationResponse from(Notification n, Long roomId) {
        return NotificationResponse.builder()
                .id(n.getId())
                .content(n.getContent())
                .type(n.getType())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .roomId(roomId)
                .targetId(n.getTargetId())
                .build();
    }
}
