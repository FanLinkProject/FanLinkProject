package org.example.backend.ivs.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.ivs.client.AwsIvsPlaybackClient;
import org.example.backend.ivs.client.IvsPlaybackTokenResult;
import org.example.backend.ivs.dto.CreatePlaybackTokenRequest;
import org.example.backend.ivs.dto.CreatePlaybackTokenResponse;
import org.example.backend.ivs.exception.IvsErrorCode;
import org.example.backend.ivs.exception.IvsException;
import org.example.backend.ivs.gateway.LiveSessionGateway;
import org.example.backend.ivs.gateway.LiveSessionInfo;
import org.example.backend.ivs.gateway.LiveSessionStatus;
import org.example.backend.ivs.util.IvsTimeUtil;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@ConditionalOnProperty(prefix = "ivs.playback-auth", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
public class IvsPlaybackTokenService {

    private final LiveSessionGateway liveSessionGateway;
    private final SubscriptionGateway subscriptionGateway;
    private final AwsIvsPlaybackClient awsIvsPlaybackClient;
    private final IvsTimeUtil ivsTimeUtil;

    // IVS Playback Token 발급을 처리한다.
    public CreatePlaybackTokenResponse issueToken(Long userId, CreatePlaybackTokenRequest request) {
        if (userId == null) {
            throw new IvsException(IvsErrorCode.FORBIDDEN_OPERATION, "로그인이 필요합니다.");
        }
        if (request == null || request.liveSessionId() == null) {
            throw new IvsException(IvsErrorCode.INVALID_REQUEST, "liveSessionId가 필요합니다.");
        }
        int ttlSeconds = validateTtl(request.ttlSeconds());

        LiveSessionInfo liveSession = liveSessionGateway.getById(request.liveSessionId());
        if (liveSession.channelArn() == null || liveSession.channelArn().isBlank()) {
            throw new IvsException(IvsErrorCode.INVALID_REQUEST, "channelArn을 찾을 수 없습니다.");
        }
        if (liveSession.status() != LiveSessionStatus.LIVE) {
            throw new IvsException(IvsErrorCode.INVALID_SESSION_STATE, "LIVE 상태가 아닙니다.");
        }

        if (liveSession.isPaid()) {
            if (userId.equals(liveSession.artistId())) {
                // 아티스트 본인은 구독 여부와 무관하게 접근 가능
                return buildResponse(liveSession.channelArn(), ttlSeconds, userId);
            }
            boolean subscribed = subscriptionGateway.isSubscribed(userId, liveSession.artistId());
            if (!subscribed) {
                throw new IvsException(IvsErrorCode.SUBSCRIPTION_REQUIRED, "구독이 필요합니다.");
            }
        }

        return buildResponse(liveSession.channelArn(), ttlSeconds, userId);
    }

    // ttlSeconds 정책(60~600)을 검증한다.
    private int validateTtl(Integer ttlSeconds) {
        if (ttlSeconds == null || ttlSeconds < 60 || ttlSeconds > 600) {
            throw new IvsException(IvsErrorCode.INVALID_TTL, "ttlSeconds는 60~600 범위여야 합니다.");
        }
        return ttlSeconds;
    }

    // IVS 호출 결과로 응답 DTO를 구성한다.
    private CreatePlaybackTokenResponse buildResponse(String channelArn, int ttlSeconds, Long userId) {
        IvsPlaybackTokenResult result = awsIvsPlaybackClient.createPlaybackToken(channelArn, ttlSeconds, userId);
        Instant expiresAt = result.expiresAt();
        int refreshHint = ivsTimeUtil.recommendedRefreshSeconds(ttlSeconds);
        return new CreatePlaybackTokenResponse(
                result.token(),
                expiresAt,
                ttlSeconds,
                refreshHint
        );
    }
}
