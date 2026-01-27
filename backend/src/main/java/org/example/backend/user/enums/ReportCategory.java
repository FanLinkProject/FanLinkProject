package org.example.backend.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReportCategory {
    SPAM, // 스팸
    ABUSE, // 욕설
    FRAUD, // 사기, 사칭
    PLASTER, // 도배
    OTHER; // 기타
}
