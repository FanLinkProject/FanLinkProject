package org.example.backend.ivs.client;

import org.example.backend.ivs.exception.IvsErrorCode;
import org.example.backend.ivs.exception.IvsException;
import org.example.backend.ivs.util.IvsPlaybackTokenSigner;

import java.security.PrivateKey;
import java.time.Instant;

public class AwsSdkIvsPlaybackClient implements AwsIvsPlaybackClient {

    private final IvsPlaybackTokenSigner signer;
    private final PrivateKey privateKey;

    // IVS Playback Authorization 토큰 서명 클라이언트를 생성한다.
    public AwsSdkIvsPlaybackClient(IvsPlaybackTokenSigner signer, PrivateKey privateKey) {
        this.signer = signer;
        this.privateKey = privateKey;
    }

    // 서버가 직접 서명한 Playback Authorization 토큰을 생성한다.
    @Override
    public IvsPlaybackTokenResult createPlaybackToken(String channelArn, int ttlSeconds, Long userId) {
        try {
            String token = signer.createToken(channelArn, ttlSeconds, privateKey, userId);
            Instant expiresAt = Instant.now().plusSeconds(ttlSeconds);
            return new IvsPlaybackTokenResult(token, expiresAt);
        } catch (Exception e) {
            throw new IvsException(IvsErrorCode.IVS_API_FAILED, "IVS 토큰 서명 실패: " + e.getMessage());
        }
    }
}
