package org.example.backend.ivs.client;

public interface AwsIvsPlaybackClient {

    // IVS Playback Token을 발급한다.
    IvsPlaybackTokenResult createPlaybackToken(String channelArn, int ttlSeconds, Long userId);
}
