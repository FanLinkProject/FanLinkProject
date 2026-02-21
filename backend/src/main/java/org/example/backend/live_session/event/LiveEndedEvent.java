package org.example.backend.live_session.event;

import java.time.Instant;

/**
 * 라이브 실제 종료(LIVE → ENDED) 시 발행하는 도메인 이벤트.
 * WebSocket 전송은 LiveSystemEventPublisher에서 처리하여 순환참조를 피한다.
 */
public record LiveEndedEvent(Long liveSessionId, Instant endedAt) {
}
