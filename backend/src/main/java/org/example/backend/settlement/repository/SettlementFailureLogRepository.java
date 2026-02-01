package org.example.backend.settlement.repository;

import org.example.backend.settlement.entity.SettlementFailureLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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
    List<SettlementFailureLog> findUnprocessedBetween(LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 특정 Payment의 실패 로그 존재 여부 확인
     *
     * @param paymentId 결제 ID
     * @return 존재 여부
     */
    boolean existsByPaymentIdAndIsProcessedFalse(Long paymentId);
}
