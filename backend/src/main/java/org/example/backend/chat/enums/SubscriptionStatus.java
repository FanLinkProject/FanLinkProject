package org.example.backend.chat.enums;

/**
 * 아티스트 구독 상태
 * 
 * 역할:
 * - 채팅 접근 권한 판단의 기준
 * - ArtistSubscription.isActive() 메서드와 함께 사용
 */
public enum SubscriptionStatus {
	/**
	 * 활성 구독
	 * - 채팅 접근 가능 (expiredAt이 null이거나 미래인 경우)
	 */
	ACTIVE,
	
	/**
	 * 만료된 구독
	 * - 채팅 접근 불가
	 */
	EXPIRED
}
