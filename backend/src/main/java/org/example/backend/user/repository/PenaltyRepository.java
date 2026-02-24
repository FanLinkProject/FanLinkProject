package org.example.backend.user.repository;

import org.example.backend.user.entity.Penalty;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.PenaltyType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PenaltyRepository extends JpaRepository<Penalty, Long> {
    // 전체 조회
    Page<Penalty> findAll(Pageable pageable);

    // userId로 조회
    Page<Penalty> findByUserId(Long userId, Pageable pageable);

    // 패널티 타입으로 조회
    Page<Penalty> findByPenaltyType(PenaltyType penaltyType, Pageable pageable);

    // 패널티 조회 (관리자 기준)
    Page<Penalty> findByAdminId(Long adminId, Pageable pageable);

    /** 관리자별 패널티 조회: 대상 회원 닉네임/이메일 검색, created_at 최신순 */
    @Query("SELECT p FROM Penalty p WHERE p.admin.id = :adminId " +
            "AND (:nickname IS NULL OR LOWER(p.user.nickname) LIKE LOWER(CONCAT('%', :nickname, '%'))) " +
            "AND (:email IS NULL OR LOWER(p.user.email) LIKE LOWER(CONCAT('%', :email, '%'))) " +
            "ORDER BY p.createdAt DESC")
    Page<Penalty> findWithFilters(@Param("adminId") Long adminId, @Param("nickname") String nickname,
                                   @Param("email") String email, Pageable pageable);
}
