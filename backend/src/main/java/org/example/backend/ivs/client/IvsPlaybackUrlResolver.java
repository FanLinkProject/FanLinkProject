package org.example.backend.ivs.client;

/**
 * IVS 채널의 현재 스트림 재생 URL을 조회한다.
 */
public interface IvsPlaybackUrlResolver {

    /** @param channelArn IVS 채널 ARN. @return 재생 URL 또는 null */
    String getPlaybackUrl(String channelArn);
}
