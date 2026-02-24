package org.example.backend.report.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.repository.CommentRepository;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.post.entity.FanPost;
import org.example.backend.post.repository.FanPostRepository;
import org.example.backend.report.dto.request.CommentReportRequest;
import org.example.backend.report.dto.request.FanPostReportRequest;
import org.example.backend.report.entity.CommentReport;
import org.example.backend.report.entity.FanPostReport;
import org.example.backend.report.repository.CommentReportRepository;
import org.example.backend.report.repository.FanPostReportRepository;
import org.example.backend.user.entity.Report;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.ReportCategory;
import org.example.backend.user.enums.ReportType;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.ReportRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private static final String DEFAULT_REASON_DETAIL = "(상세 사유 없음)";

    private final UserRepository userRepository;
    private final FanPostRepository fanPostRepository;
    private final CommentRepository commentRepository;
    private final FanPostReportRepository fanPostReportRepository;
    private final CommentReportRepository commentReportRepository;
    private final ReportRepository reportRepository;

    private static String normalizeReasonDetail(String reasonDetail) {
        return (reasonDetail != null && !reasonDetail.isBlank()) ? reasonDetail : DEFAULT_REASON_DETAIL;
    }

    private static boolean isSuspended(User user) {
        return user.getStatus() == UserStatus.SUSPENDED || user.getStatus() == UserStatus.BANNED;
    }

    private void validateAndSaveAdminReport(User reporter, User reported, ReportCategory category,
                                            String reasonDetail, ReportType type) {
        if (isSuspended(reported)) {
            throw new BusinessException(UserErrorCode.USER_ALREADY_SUSPENDED);
        }
        if (reportRepository.existsByReporterAndReportedAndCategory(reporter, reported, category)) {
            throw new BusinessException(UserErrorCode.REPORT_ALREADY_SUBMITTED);
        }
        Report adminReport = new Report();
        adminReport.setReporter(reporter);
        adminReport.setReported(reported);
        adminReport.setCategory(category);
        adminReport.setReasonDetail(reasonDetail);
        adminReport.setType(type);
        adminReport.setStatus(false);
        reportRepository.save(adminReport);
    }

    @Transactional
    public void reportFanPost(Long userId, FanPostReportRequest request) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        FanPost target = fanPostRepository.findById(request.getTargetId())
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
        User reported = target.getUser();
        ReportCategory category = request.getCategory() != null ? request.getCategory() : ReportCategory.OTHER;
        String reasonDetail = normalizeReasonDetail(request.getReasonDetail());

        validateAndSaveAdminReport(reporter, reported, category, reasonDetail, ReportType.POST);

        if (!fanPostReportRepository.existsByReporterAndTarget(reporter, target)) {
            fanPostReportRepository.save(
                    FanPostReport.builder().reporter(reporter).target(target).build());
        }
    }

    @Transactional
    public void reportComment(Long userId, CommentReportRequest request) {
        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Comment target = commentRepository.findById(request.getTargetId())
                .orElseThrow(() -> new IllegalArgumentException("Comment not found"));
        User reported = userRepository.findById(target.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Reported user not found"));
        ReportCategory category = request.getCategory() != null ? request.getCategory() : ReportCategory.OTHER;
        String reasonDetail = normalizeReasonDetail(request.getReasonDetail());

        validateAndSaveAdminReport(reporter, reported, category, reasonDetail, ReportType.USER);

        if (!commentReportRepository.existsByReporterAndTarget(reporter, target)) {
            commentReportRepository.save(
                    CommentReport.builder().reporter(reporter).target(target).build());
        }
    }
}
