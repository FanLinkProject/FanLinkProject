package org.example.backend.live_session.dto.response;

import java.time.OffsetDateTime;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * LiveSessionCandidateResponse
 *
 * - LS4) Replay 후보 조회용 Response DTO
 * - GET /api/live-sessions?artistId=...&status=RECORDED
 *
 * 용도:
 * - Replay 발행 시 "다시보기 후보 라이브 세션 목록"을 제공하기 위한 요약 DTO
 * - 목록 조회 전용으로, 상세 정보(streamId 등)는 포함하지 않는다.
 *
 * 포함 기준:
 * - artistId 일치
 * - status = RECORDED
 * - expiresAt 이 지난 세션은 제외 (null 허용)
 *
 * 포함 필드:
 * - 라이브 식별 및 표시용 최소 정보(id, title, isPaid)
 * - Replay 유효성 판단용 메타 정보(endedAt, expiresAt)
 * - 녹화본 위치 정보(recordingS3Bucket, recordingS3Prefix)
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class LiveSessionCandidateResponse {

	private Long id;
	private Long artistId;
	private String title;
	private Boolean isPaid;

	private OffsetDateTime endedAt;
	private OffsetDateTime expiresAt;

	private String recordingS3Bucket;
	private String recordingS3Prefix;
}