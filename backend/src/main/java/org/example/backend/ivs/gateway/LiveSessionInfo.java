package org.example.backend.ivs.gateway;

// LiveSession 정보를 IVS 도메인에서 쓰기 위한 DTO.
public record LiveSessionInfo(
        Long liveSessionId,
        Long artistId,
        String channelArn,
        boolean isPaid,
        LiveSessionStatus status,
        String playbackUrl
) {
}
