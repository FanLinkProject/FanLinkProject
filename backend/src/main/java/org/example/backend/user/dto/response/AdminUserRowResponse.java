package org.example.backend.user.dto.response;

import org.example.backend.user.entity.User;

import java.time.LocalDateTime;

/** 관리자 회원 목록 한 행 */
public record AdminUserRowResponse(
        Long id,
        String nickname,
        String email,
        String role,
        String status,
        LocalDateTime createdAt
) {
    public static AdminUserRowResponse from(User user) {
        return new AdminUserRowResponse(
                user.getId(),
                user.getNickname(),
                user.getEmail(),
                user.getRole() != null ? user.getRole().name() : "USER",
                user.getStatus() != null ? user.getStatus().name() : "ACTIVE",
                user.getCreatedAt()
        );
    }
}
