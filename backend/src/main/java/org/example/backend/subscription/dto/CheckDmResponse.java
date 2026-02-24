package org.example.backend.subscription.dto;

/**
 * 해당 아티스트와의 DM 구독 여부 및 채팅방 ID 응답.
 * 사용: GET /api/subscriptions/check-dm?artistId=
 */
public record CheckDmResponse(
        boolean hasSubscription,
        Long roomId,
        String error
) {
    public static CheckDmResponse notSubscribed() {
        return new CheckDmResponse(false, null, null);
    }

    public static CheckDmResponse subscribed(Long roomId) {
        return new CheckDmResponse(true, roomId, null);
    }

    public static CheckDmResponse error(String errorMessage) {
        return new CheckDmResponse(false, null, errorMessage);
    }
}
