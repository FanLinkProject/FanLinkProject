package org.example.backend.report.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.report.dto.request.CommentReportRequest;
import org.example.backend.report.dto.request.FanPostReportRequest;
import org.example.backend.report.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping("/fan-posts")
    public ResponseEntity<Void> reportFanPost(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody FanPostReportRequest request) {
        reportService.reportFanPost(principal.getUser().getId(), request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/comments")
    public ResponseEntity<Void> reportComment(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody CommentReportRequest request) {
        reportService.reportComment(principal.getUser().getId(), request);
        return ResponseEntity.ok().build();
    }
}
