package org.example.backend.report.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.user.enums.ReportCategory;

@Getter
@NoArgsConstructor
public class FanPostReportRequest {
    private Long targetId;
    private ReportCategory category;
    private String reasonDetail;
}
