package org.example.backend.chat.enums;

/**
 * 채팅 메시지 타입
 * 
 * 역할:
 * - 아티스트/팬 권한 분기의 핵심
 * - 메시지 조회 필터링 규칙의 기준
 * 
 * 필터링 규칙 (팬 화면 조회 시):
 *   (type=ARTIST) OR (type=FAN AND sender_id=me)
 * 
 * 아티스트 화면:
 *   - 모든 메시지 조회 가능 (ARTIST + 모든 FAN 메시지)
 *   - 팬별로 버블/스레드 형태로 표시
 */
public enum MessageType {
	/**
	 * 아티스트 발신 메시지
	 * - 아티스트만 발송 가능 (ChatService에서 room.owner == sender 검증)
	 * - 모든 팬에게 브로드캐스트 (팬 화면에서도 모두 보임)
	 */
	ARTIST,
	
	/**
	 * 팬 발신 메시지
	 * - 팬이 발송
	 * - 팬 화면에서는 "본인 메시지만" 보이도록 필터링 필수
	 *   → 조회 조건: type=FAN AND sender_id=현재_로그인_팬_ID
	 * - 아티스트 화면에서는 모든 팬의 FAN 메시지가 보임
	 */
	FAN
}
