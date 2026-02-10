package org.example.backend.user.dto.response;

import java.util.List;

// 로그인 유저 메인 홈 화면 dto
public record UserHomeResponse(
        List<FollowedArtist> followedArtists,
        List<DmNotification> dmNotifications,
        List<NotificationItem> notifications
) {

    /**
     * 팔로우 중인 아티스트
     */
    public record FollowedArtist(
            Long artistId,
            String nickname,
            String profileImageUrl
    ) {
    }

    /**
     * DM 알림 (아티스트에게서 온 메시지)
     */
    public record DmNotification(
            Long chatRoomId,
            Long artistId,
            String artistNickname,
            String artistProfileImageUrl,
            String lastMessage,
            String lastMessageTime,
            boolean isRead
    ) {
    }

    /**
     * 알림 아이템
     */
    public record NotificationItem(
            Long notificationId,
            String type,
            String content,
            String createdAt,
            boolean isRead
    ) {
    }
}
