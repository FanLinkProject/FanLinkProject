package org.example.backend.user.repository;

import org.example.backend.user.entity.Report;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.ReportCategory;
import org.example.backend.user.enums.ReportType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    // 페이징된 전체 조회
    Page<Report> findAll(Pageable pageable);
    
    // 신고한 사용자로 조회
    Page<Report> findByReporter(User reporter, Pageable pageable);
    
    // 신고당한 사용자로 조회
    Page<Report> findByReported(User reported, Pageable pageable);
    
    // 신고당한 사용자 ID로 조회
    Page<Report> findByReportedId(Long reportedId, Pageable pageable);
    
    // 신고 타입으로 조회 (게시글인지, 유저인지)
    Page<Report> findByType(ReportType type, Pageable pageable);
    
    // 신고 카테고리로 조회 (스팸, 욕설 등..)
    Page<Report> findByCategory(ReportCategory category, Pageable pageable);
    
    // 신고 상태로 조회
    Page<Report> findByStatus(boolean status, Pageable pageable);
    
    // 신고 타입과 카테고리로 조회
    Page<Report> findByTypeAndCategory(ReportType type, ReportCategory category, Pageable pageable);

    /** 신고자·피신고자·카테고리가 모두 동일한 신고가 이미 있는지 */
    boolean existsByReporterAndReportedAndCategory(User reporter, User reported, ReportCategory category);

    // 관리자 홈용: 대기 중인 신고 건수 (status = false)
    long countByStatusFalse();

    // 관리자 홈용: 처리 완료된 신고 건수 (status = true)
    long countByStatusTrue();

    /** 신고 기각: status만 true로 변경 (엔티티 로드 없이 쿼리만 실행) */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Report r SET r.status = true WHERE r.id = :id")
    int markStatusTrueById(@Param("id") Long id);

    /** 닉네임·이메일·처리 상태로 검색 (null/빈 값은 조건 제외) */
    @Query("SELECT r FROM Report r " +
            "WHERE (:nickname IS NULL OR LOWER(r.reporter.nickname) LIKE LOWER(CONCAT('%', :nickname, '%')) OR LOWER(r.reported.nickname) LIKE LOWER(CONCAT('%', :nickname, '%'))) " +
            "AND (:email IS NULL OR LOWER(r.reporter.email) LIKE LOWER(CONCAT('%', :email, '%')) OR LOWER(r.reported.email) LIKE LOWER(CONCAT('%', :email, '%'))) " +
            "AND (:status IS NULL OR r.status = :status)")
    Page<Report> findWithFilters(@Param("nickname") String nickname, @Param("email") String email, @Param("status") Boolean status, Pageable pageable);
}
