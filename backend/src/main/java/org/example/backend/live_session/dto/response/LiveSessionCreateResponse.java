package org.example.backend.live_session.dto.response;

import java.time.OffsetDateTime;

import org.example.backend.live_session.enums.LiveSessionStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * LiveSessionCreateResponse
 *
 * - LS1) 라이브 시작(세션 생성) Response DTO
 * - POST /api/live-sessions
 *
 * 용도:
 * - 아티스트가 라이브 방송을 시작할 때 생성된 LiveSession의 핵심 정보 반환
 * - 채팅방(roomId) 및 IVS 연동의 기준 식별자를 제공한다.
 *
 * 특징:
 * - id == liveSessionId == chat roomId
 * - 생성 시 status 는 항상 LIVE
 * - 라이브 시작 시점(startedAt)을 클라이언트에 전달
 *
 * 포함 필드:
 * - 라이브 식별 정보(id)
 * - IVS 채널 정보(channelArn)
 * - 유료 여부(isPaid)
 * - 라이브 상태(status)
 * - 라이브 시작 시각(startedAt)
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveSessionCreateResponse {
	private Long id;
	private String channelArn;
	private Boolean isPaid;
	private LiveSessionStatus status;
	private OffsetDateTime startedAt;
}
