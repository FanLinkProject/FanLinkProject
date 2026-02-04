package org.example.backend.user.dto.response;

import org.example.backend.user.entity.Report;
import org.example.backend.user.enums.ReportCategory;
import org.example.backend.user.enums.ReportType;

import java.time.LocalDateTime;

// 신고 내역 조회 dto
public record ReportResponse(
        Long reportId,
        Long reporterUserId,
        String reporterUserNickname,
        Long reportedUserId,
        String reportedUserNickname,
        ReportCategory category,
        String reasonDetail,
        ReportType type,
        boolean status, // 처리 여부
        LocalDateTime createdAt
) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(
                report.getId(),
                report.getReporter().getId(),
                report.getReporter().getNickname(),
                report.getReported().getId(),
                report.getReported().getNickname(),
                report.getCategory(),
                report.getReasonDetail(),
                report.getType(),
                report.isStatus(),
                report.getCreatedAt()
        );
    }
}
