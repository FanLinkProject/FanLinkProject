package org.example.backend.live_session.dto.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

/**
 * STOMP /sub/live/{liveSessionId} 로 발행하는 라이브 종료 시스템 이벤트 payload.
 * - type: "SYSTEM", event: "LIVE_ENDED"
 * - 팬 클라이언트는 이 메시지를 수신하면 종료 배너 표시 및 채팅 비활성화.
 */
@Getter
@Builder
public class LiveEndedEventPayload {

	public static final String TYPE_SYSTEM = "SYSTEM";
	public static final String EVENT_LIVE_ENDED = "LIVE_ENDED";

	private final String type = TYPE_SYSTEM;
	private final String event = EVENT_LIVE_ENDED;

	@JsonProperty("liveSessionId")
	private final Long liveSessionId;

	@JsonProperty("endedAt")
	private final String endedAt; // ISO-8601 Instant 문자열
}
