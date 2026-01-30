package org.example.backend.settlement.repository;

import org.example.backend.settlement.entity.SettlementPending;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SettlementPendingRepository extends JpaRepository<SettlementPending, Long> {

    // [Batch] 기간 내 특정 아티스트의 대기열 조회
    @Query("SELECT sp FROM SettlementPending sp " +
            "WHERE sp.artistId = :artistId " +
            "AND sp.createdAt >= :start AND sp.createdAt <= :end")
    List<SettlementPending> findAllByArtistIdAndDateRange(
            @Param("artistId") Long artistId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // [Batch] 대량 삭제 최적화
    @Modifying
    @Query("DELETE FROM SettlementPending sp WHERE sp.id IN :ids")
    void deleteAllByIdIn(@Param("ids") List<Long> ids);

    /**
     * [Dashboard] 정산 예상 금액 계산용
     * 아티스트의 대기열 데이터를 소스 타입(상품, 캔디 등)별로 그룹핑하여 합계를 구함
     * 결과 예시: [[PRODUCT, 100000], [CANDY, 5000]]
     */
    @Query("SELECT sp.sourceType, COALESCE(SUM(sp.amount), 0) " +
            "FROM SettlementPending sp " +
            "WHERE sp.artistId = :artistId " +
            "GROUP BY sp.sourceType")
    List<Object[]> findTotalAmountGroupBySourceType(@Param("artistId") Long artistId);
}