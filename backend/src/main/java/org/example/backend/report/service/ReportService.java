package org.example.backend.report.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.repository.CommentRepository;
import org.example.backend.post.entity.FanPost;
import org.example.backend.post.repository.FanPostRepository;
import org.example.backend.report.dto.request.CommentReportRequest;
import org.example.backend.report.dto.request.FanPostReportRequest;
import org.example.backend.report.entity.CommentReport;
import org.example.backend.report.entity.FanPostReport;
import org.example.backend.report.repository.CommentReportRepository;
import org.example.backend.report.repository.FanPostReportRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final UserRepository userRepository;
    private final FanPostRepository fanPostRepository;
    private final CommentRepository commentRepository;
    private final FanPostReportRepository fanPostReportRepository;
    private final CommentReportRepository commentReportRepository;

    @Transactional
    public void reportFanPost(Long userId, FanPostReportRequest request) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        FanPost target = fanPostRepository.findById(request.getTargetId())
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (fanPostReportRepository.existsByReporterAndTarget(reporter, target)) {
            throw new IllegalArgumentException("Already reported");
        }

        FanPostReport report = FanPostReport.builder()
                .reporter(reporter)
                .target(target)
                .build();

        fanPostReportRepository.save(report);
    }

    @Transactional
    public void reportComment(Long userId, CommentReportRequest request) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Comment target = commentRepository.findById(request.getTargetId())
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));

        if (commentReportRepository.existsByReporterAndTarget(reporter, target)) {
            throw new IllegalArgumentException("Already reported");
        }

        CommentReport report = CommentReport.builder()
                .reporter(reporter)
                .target(target)
                .build();

        commentReportRepository.save(report);
    }
}
