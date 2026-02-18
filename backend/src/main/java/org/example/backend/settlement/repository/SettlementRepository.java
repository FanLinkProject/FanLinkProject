package org.example.backend.settlement.repository;

import org.example.backend.settlement.entity.Settlement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    // [중복 방지] 해당 기간, 해당 아티스트의 정산서가 이미 존재하는지 체크
    boolean existsByArtistIdAndStartDateAndEndDate(Long artistId, LocalDate startDate, LocalDate endDate);

    // Service에서 호출 중인 목록 조회 메서드
    List<Settlement> findAllByArtistIdOrderBySettledAtDesc(Long artistId);

    // ===== [관리자용] =====

    // [관리자] 전체 정산 내역 조회 (최신순, 페이징)
    Page<Settlement> findAllByOrderBySettledAtDesc(Pageable pageable);

    // [관리자] 특정 아티스트의 정산 내역 조회 (페이징)
    Page<Settlement> findAllByArtistIdOrderBySettledAtDesc(Long artistId, Pageable pageable);

    // [관리자] 정산 이력이 있는 아티스트 ID 목록 조회 (DISTINCT)
    @Query("SELECT DISTINCT s.artistId FROM Settlement s")
    List<Long> findDistinctArtistIds();

    // [관리자] 특정 아티스트의 정산 집계 (총 매출, 총 수수료, 총 지급액, 정산 횟수)
    @Query("SELECT COALESCE(SUM(s.totalSalesAmount), 0), " +
           "COALESCE(SUM(s.feeAmount), 0), " +
           "COALESCE(SUM(s.finalAmount), 0), " +
           "COUNT(s) " +
           "FROM Settlement s WHERE s.artistId = :artistId")
    Object[] findSettlementSummaryByArtistId(@Param("artistId") Long artistId);

    // [관리자] 전체 아티스트 정산 집계 (Bulk)
    @Query("SELECT s.artistId, " +
           "COALESCE(SUM(s.totalSalesAmount), 0), " +
           "COALESCE(SUM(s.feeAmount), 0), " +
           "COALESCE(SUM(s.finalAmount), 0), " +
           "COUNT(s) " +
           "FROM Settlement s " +
           "GROUP BY s.artistId")
    List<Object[]> findAllSettlementSummariesGroupByArtist();

}