package org.example.backend.user.repository;

import org.example.backend.user.entity.Penalty;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.PenaltyType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PenaltyRepository extends JpaRepository<Penalty, Long> {
    // 전체 조회
    Page<Penalty> findAll(Pageable pageable);

    // userId로 조회
    Page<Penalty> findByUserId(Long userId, Pageable pageable);

    // 패널티 타입으로 조회
    Page<Penalty> findByPenaltyType(PenaltyType penaltyType, Pageable pageable);
}
