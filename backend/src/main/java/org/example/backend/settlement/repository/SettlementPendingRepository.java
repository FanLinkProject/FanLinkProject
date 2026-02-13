package org.example.backend.settlement.repository;

import org.example.backend.settlement.entity.SettlementPending;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface SettlementPendingRepository extends JpaRepository<SettlementPending, Long> {

    /**
     * [INSERT IGNORE] 중복 데이터 스킵 저장
     * Unique Constraint(payment_id, artist_id, order_name) 위반 시 해당 행만 무시하고,
     * 나머지 행은 정상 저장됩니다.
     * JPA 영속성 컨텍스트를 거치지 않으므로 Hibernate 세션 오염 문제가 없습니다.
     *
     * @return 실제 INSERT된 행 수 (중복이면 0)
     */
    @Modifying
    @Query(value = "INSERT IGNORE INTO settlement_pendings " +
            "(payment_id, artist_id, amount, order_name, source_type, created_at) " +
            "VALUES (:paymentId, :artistId, :amount, :orderName, :sourceType, :createdAt)",
            nativeQuery = true)
    int insertIgnore(
            @Param("paymentId") Long paymentId,
            @Param("artistId") Long artistId,
            @Param("amount") Long amount,
            @Param("orderName") String orderName,
            @Param("sourceType") String sourceType,
            @Param("createdAt") Instant createdAt
    );

    // [Batch] 기간 내 특정 아티스트의 대기열 조회
    // start 이상, end 미만 (반개방 구간: [start, end))
    @Query("SELECT sp FROM SettlementPending sp " +
            "WHERE sp.artistId = :artistId " +
            "AND sp.createdAt >= :start AND sp.createdAt < :end")
    List<SettlementPending> findAllByArtistIdAndDateRange(
            @Param("artistId") Long artistId,
            @Param("start") Instant start,
            @Param("end") Instant end);

    // [Batch] 대량 삭제 최적화
    @Modifying
    @Query("DELETE FROM SettlementPending sp WHERE sp.id IN :ids")
    void deleteAllByIdIn(@Param("ids") List<Long> ids);

    // [중복 방지] 이미 처리된 결제인지 확인
    boolean existsByPaymentId(Long paymentId);


    /**
     * [Dashboard] 정산 예상 금액 계산용
     * 아티스트의 대기열 데이터를 소스 타입(상품, 캔디 등)별로 그룹핑하여 합계를 구함
     */
    @Query("SELECT sp.sourceType, COALESCE(SUM(sp.amount), 0) " +
            "FROM SettlementPending sp " +
            "WHERE sp.artistId = :artistId " +
            "GROUP BY sp.sourceType")
    List<Object[]> findTotalAmountGroupBySourceType(@Param("artistId") Long artistId);

    // [Dashboard Bulk] 전체 아티스트 예상 금액 조회
    @Query("SELECT sp.artistId, sp.sourceType, COALESCE(SUM(sp.amount), 0) " +
            "FROM SettlementPending sp " +
            "GROUP BY sp.artistId, sp.sourceType")
    List<Object[]> findAllEstimatedAmountsGroupByArtist();
}
