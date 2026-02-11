package org.example.backend.like.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.backend.like.exception.LikeErrorCode;
import org.example.backend.like.exception.LikeException;

@Getter
@RequiredArgsConstructor
public enum LikeTarget {

    FAN_POST("팬 게시글"),
    ARTIST_POST("아티스트 게시글"),
    COMMENT("댓글");

    private final String description;

    @JsonValue
    public String getValue() {
        return this.name();
    }

    /**
     * JSON 요청(String) -> Enum 변환 로직
     * 잘못된 값이 들어오면 LikeException(INVALID_TARGET_TYPE) 발생
     */
    @JsonCreator
    public static LikeTarget from(String value) {
        if (value == null || value.isBlank()) {
            throw new LikeException(LikeErrorCode.INVALID_TARGET_TYPE);
        }

        // 1. 입력값 정제 (공백, 하이픈 -> 언더바, 대문자 변환)
        String normalized = value.trim().toUpperCase()
                .replace("-", "_")
                .replace(" ", "_");

        // 2. Enum 변환 시도
        try {
            return LikeTarget.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            // 3. 일치하는 Enum이 없으면 커스텀 예외 발생!
            throw new LikeException(LikeErrorCode.INVALID_TARGET_TYPE);
        }
    }
}