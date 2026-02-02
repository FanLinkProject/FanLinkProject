package org.example.backend.chat.repository;

import org.example.backend.chat.entity.ArtistSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 아티스트 구독 Repository
 * 
 * 역할:
 * - ArtistSubscription 엔티티의 기본 CRUD 제공
 * 
 * 주요 사용:
 * - 채팅 접근 권한 검증 (구독 상태 확인)
 * - 팬이 아티스트 채팅방에 접근 가능한지 판단
 */
public interface ArtistSubscriptionRepository extends JpaRepository<ArtistSubscription, Long> {
}
