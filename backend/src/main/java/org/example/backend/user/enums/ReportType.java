package org.example.backend.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReportType {
    user,
    게시글; // 전달받으면 수정
}
