package org.example.backend.settlement.repository;

import org.example.backend.settlement.entity.SettlementDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SettlementDetailRepository extends JpaRepository<SettlementDetail, Long> {
    @Query("SELECT sd FROM SettlementDetail sd JOIN FETCH sd.settlement WHERE sd.settlement.id = :settlementId")
    List<SettlementDetail> findAllBySettlementId(Long settlementId);
}
