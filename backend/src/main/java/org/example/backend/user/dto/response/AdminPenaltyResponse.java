package org.example.backend.user.dto.response;

import org.example.backend.user.entity.Penalty;
import org.example.backend.user.enums.PenaltyType;

import java.time.LocalDateTime;

// 패널티 내역 조회 dto
public record AdminPenaltyResponse(
        Long id,
        Long userId,                // 패널티를 받은 사용자 ID
        String userNickname,        // 패널티를 받은 사용자 닉네임
        PenaltyType penaltyType,
        String reason,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        LocalDateTime createdAt,
        boolean isActive  // 현재 활성화된 패널티인지
) {
    public static AdminPenaltyResponse from(Penalty penalty) {
        LocalDateTime now = LocalDateTime.now();
        boolean isActive = penalty.getStartedAt().isBefore(now) &&
                (penalty.getEndedAt() == null || penalty.getEndedAt().isAfter(now));
        
        return new AdminPenaltyResponse(
                penalty.getId(),
                penalty.getUser().getId(),
                penalty.getUser().getNickname(),
                penalty.getPenaltyType(),
                penalty.getReason(),
                penalty.getStartedAt(),
                penalty.getEndedAt(),
                penalty.getCreatedAt(),
                isActive
        );
    }
}
