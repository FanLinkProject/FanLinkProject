package org.example.backend.like.dto;

import jakarta.validation.constraints.NotNull;
import org.example.backend.like.enums.LikeTarget;

public record LikeRequest(
        @NotNull(message = "좋아요 대상 타입은 필수입니다")
        LikeTarget targetType,

        @NotNull(message = "좋아요 대상 ID는 필수입니다")
        Long targetId
) {}
