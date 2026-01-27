package org.example.backend.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PenaltyType {
    RESTRICT, // 글쓰기/댓글 제한
    WEEKEND_BAN, // 1주일 접속차단
    PERMANENT_BAN; // 영구정지
}
