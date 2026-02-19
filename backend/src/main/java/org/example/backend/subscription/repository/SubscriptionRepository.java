package org.example.backend.subscription.repository;

import org.example.backend.subscription.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    // 유저별 구독 조회
    List<Subscription> findByUserId(Long userId);

    // 유저별 활성 구독 조회
    List<Subscription> findByUserIdAndIsActive(Long userId, Boolean isActive);

    // 특정 유저의 특정 상품 활성 구독 조회 (중복 방지)
    Optional<Subscription> findByUserIdAndProduct_IdAndIsActive(Long userId, Long productId, Boolean isActive);

    // 스케줄러용: 결제일이 지난 활성 구독 조회
    @Query("SELECT s FROM Subscription s WHERE s.nextPaymentDate <= :date AND s.isActive = true")
    List<Subscription> findByNextPaymentDateBeforeAndIsActive(@Param("date") Instant date);

    // 현금 구독만 조회 (빌링키 있음)
    @Query("SELECT s FROM Subscription s WHERE s.billingKey IS NOT NULL AND s.isActive = true AND s.nextPaymentDate <= :date")
    List<Subscription> findCashSubscriptionsDue(@Param("date") Instant date);

    // 캔디 구독만 조회 (빌링키 없음)
    @Query("SELECT s FROM Subscription s WHERE s.billingKey IS NULL AND s.isActive = true AND s.nextPaymentDate <= :date")
    List<Subscription> findCandySubscriptionsDue(@Param("date") Instant date);

	// 유저가 해당 아티스트를 현재 구독 중인지 여부 확인 (유료 라이브 채팅/접근 권한 검증용)
	@Query("""
		select (count(s) > 0)
		from Subscription s
		where s.userId = :userId
		  and s.isActive = true
		  and s.startDate <= :now
		  and s.endDate > :now
		  and s.product.isSubscription = true
		  and s.product.artistId = :artistId
	""")
	boolean existsActiveSubscriptionForArtist(
		@Param("userId") Long userId,
		@Param("artistId") Long artistId,
		@Param("now") Instant now
	);

	// 해당 아티스트를 구독 중인 팬 userId 목록 조회 (라이브 시작 알림 발송용)
	@Query("""
		select distinct s.userId
		from Subscription s
		where s.isActive = true
		  and s.startDate <= :now
		  and s.endDate > :now
		  and s.product.isSubscription = true
		  and s.product.artistId = :artistId
	""")
	List<Long> findActiveSubscriberUserIdsByArtistId(
		@Param("artistId") Long artistId,
		@Param("now") Instant now
	);
}
