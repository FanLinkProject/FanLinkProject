package org.example.backend.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UserStatus {
    ACTIVE("STATUS_ACTIVE"), // 활동중
    SUSPENDED("STATUS_SUSPENDED"), // 일시 패널티 (1주일)
    BANNED("STATUS_BANNED"); // 영구 정지

    private final String value;
}
