package org.example.backend.user.repository;

import org.example.backend.user.entity.Report;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.ReportCategory;
import org.example.backend.user.enums.ReportType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
