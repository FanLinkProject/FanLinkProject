package org.example.backend.subscription.repository;

import org.example.backend.subscription.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    List<Subscription> findByNextPaymentDateBeforeAndIsActive(@Param("date") LocalDateTime date);

    // 현금 구독만 조회 (빌링키 있음)
    @Query("SELECT s FROM Subscription s WHERE s.billingKey IS NOT NULL AND s.isActive = true AND s.nextPaymentDate <= :date")
    List<Subscription> findCashSubscriptionsDue(@Param("date") LocalDateTime date);

    // 캔디 구독만 조회 (빌링키 없음)
    @Query("SELECT s FROM Subscription s WHERE s.billingKey IS NULL AND s.isActive = true AND s.nextPaymentDate <= :date")
    List<Subscription> findCandySubscriptionsDue(@Param("date") LocalDateTime date);
}
