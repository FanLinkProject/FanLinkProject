package org.example.backend.user.dto.response;

import org.example.backend.user.entity.Block;

import java.time.LocalDateTime;

// 차단한 유저 조회 dto
public record BlockedResponse(
        Long blockId,
        Long blockedUserId,
        String blockedUserNickname,
        String blockedUserProfileImageUrl,
        LocalDateTime blockedAt
) {
    public static BlockedResponse from(Block block) {
        return new BlockedResponse(
                block.getId(),
                block.getBlocked().getId(),
                block.getBlocked().getNickname(),
                block.getBlocked().getProfileImageUrl(),
                block.getCreatedAt()
        );
    }
}
