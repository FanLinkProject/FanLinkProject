package org.example.backend.settlement.repository;

import org.example.backend.settlement.entity.SettlementFailureLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SettlementFailureLogRepository extends JpaRepository<SettlementFailureLog, Long> {

    /**
     * 미처리된 실패 로그 조회 (복구 대상)
     *
     * @return 복구가 필요한 실패 로그 목록
     */
    List<SettlementFailureLog> findByIsProcessedFalseOrderByCreatedAtAsc();

    /**
     * 특정 기간 동안의 미처리 실패 로그 조회
     *
     * @param startDate 시작 일시
     * @param endDate   종료 일시
     * @return 해당 기간의 미처리 실패 로그
     */
    @Query("SELECT sfl FROM SettlementFailureLog sfl " +
           "WHERE sfl.isProcessed = false " +
           "AND sfl.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY sfl.createdAt ASC")
    List<SettlementFailureLog> findUnprocessedBetween(Instant startDate, Instant endDate);

    /**
     * 특정 Payment의 실패 로그 존재 여부 확인
     *
     * @param paymentId 결제 ID
     * @return 존재 여부
     */
    boolean existsByPaymentIdAndIsProcessedFalse(Long paymentId);

    // ===== [관리자용] =====

    /**
     * [관리자] 전체 실패 로그 조회 (최신순, 페이징)
     */
    Page<SettlementFailureLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * [관리자] 복구 상태별 실패 로그 조회 (최신순, 페이징)
     *
     * @param isProcessed true: 복구 완료, false: 미처리
     */
    Page<SettlementFailureLog> findByIsProcessedOrderByCreatedAtDesc(Boolean isProcessed, Pageable pageable);

    /**
     * [관리자] 미처리 실패 로그 건수
     */
    long countByIsProcessed(Boolean isProcessed);
}
