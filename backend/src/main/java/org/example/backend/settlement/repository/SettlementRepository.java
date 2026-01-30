package org.example.backend.settlement.repository;

import org.example.backend.settlement.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    // [중복 방지] 해당 기간, 해당 아티스트의 정산서가 이미 존재하는지 체크
    boolean existsByArtistIdAndStartDateAndEndDate(Long artistId, LocalDate startDate, LocalDate endDate);

    // Service에서 호출 중인 목록 조회 메서드
    List<Settlement> findAllByArtistIdOrderBySettledAtDesc(Long artistId);

}