package org.example.backend.report.repository;

import org.example.backend.report.entity.CommentReport;
import org.example.backend.user.entity.User;
import org.example.backend.comment.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentReportRepository extends JpaRepository<CommentReport, Long> {
    boolean existsByReporterAndTarget(User reporter, Comment target);
}
