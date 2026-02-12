package org.example.backend.live_session.controller;

import lombok.RequiredArgsConstructor;

import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.live_session.dto.request.LiveSessionCreateRequest;
import org.example.backend.live_session.dto.response.LiveSessionCandidateResponse;
import org.example.backend.live_session.dto.response.LiveSessionCreateResponse;
import org.example.backend.live_session.dto.response.LiveSessionResponse;
import org.example.backend.live_session.enums.LiveSessionStatus;
import org.example.backend.live_session.service.LiveSessionService;
import org.example.backend.user.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * LiveSession API. roomId = liveSessionId = LiveSession.id (PK) — 채팅팀은 이 id를 roomId로 사용.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/live-sessions")
public class LiveSessionController {

	private final LiveSessionService liveSessionService;

	/**
	 * 라이브 시작(세션 생성). 반환 id가 liveSessionId == roomId.
	 */
	@PostMapping
	public ResponseEntity<LiveSessionCreateResponse> startLive(
		@RequestBody LiveSessionCreateRequest request,
		@AuthenticationPrincipal PrincipalDetails principalDetails
	) {
		User loginUser = principalDetails.getUser();
		LiveSessionCreateResponse response = liveSessionService.startLive(loginUser, request);
		return ResponseEntity.ok(response);
	}

	/**
	 * 라이브 종료(논리 종료). LIVE → ENDED, 멱등 처리.
	 */
	@PatchMapping("/{id}/end")
	public ResponseEntity<Void> endLive(
		@PathVariable("id") Long liveSessionId,
		@AuthenticationPrincipal PrincipalDetails principalDetails
	) {
		User loginUser = principalDetails.getUser();
		liveSessionService.endLive(loginUser, liveSessionId);
		return ResponseEntity.ok().build();
	}

	/**
	 * 라이브 "접속(access)" 전용 엔드포인트
	 * - LIVE 상태인지 검증
	 * - 유료 라이브면 구독 여부 검증
	 * - 통과하면 세션 정보 반환
	 */
	@GetMapping("/{id}/access")
	public ResponseEntity<LiveSessionResponse> accessLiveSession(
		@PathVariable("id") Long liveSessionId,
		@AuthenticationPrincipal PrincipalDetails principalDetails
	) {
		User loginUser = principalDetails.getUser();

		// 라이브 접속 가능 여부(=채팅 가능 조건과 동일) 검증
		liveSessionService.validatePaidAccess(loginUser, liveSessionId);
		LiveSessionResponse response = liveSessionService.getLiveSession(liveSessionId);
		return ResponseEntity.ok(response);
	}

	/**
	 * 단건 조회. 채팅/Replay에서 liveSessionId(roomId)로 조회.
	 */
	@GetMapping("/{id}")
	public ResponseEntity<LiveSessionResponse> getLiveSession(@PathVariable("id") Long liveSessionId) {
		LiveSessionResponse response = liveSessionService.getLiveSession(liveSessionId);
		return ResponseEntity.ok(response);
	}

	/**
	 * 아티스트별 목록 조회. RECORDED/READY, expiresAt 미만료.
	 */
	@GetMapping
	public ResponseEntity<List<LiveSessionCandidateResponse>> getLiveSessionsByArtist(
		@RequestParam("artistId") Long artistId,
		@RequestParam(value = "status", required = false) LiveSessionStatus status
	) {
		List<LiveSessionCandidateResponse> responses = liveSessionService.getLiveSessionsByArtist(artistId, status);
		return ResponseEntity.ok(responses);
	}
}
