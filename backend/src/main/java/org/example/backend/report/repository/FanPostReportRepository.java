package org.example.backend.report.repository;

import org.example.backend.report.entity.FanPostReport;
import org.example.backend.user.entity.User;
import org.example.backend.post.entity.FanPost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FanPostReportRepository extends JpaRepository<FanPostReport, Long> {
    boolean existsByReporterAndTarget(User reporter, FanPost target);
}
