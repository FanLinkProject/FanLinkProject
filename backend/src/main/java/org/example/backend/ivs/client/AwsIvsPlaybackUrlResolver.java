package org.example.backend.ivs.client;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.services.ivs.IvsClient;
import software.amazon.awssdk.services.ivs.model.Channel;
import software.amazon.awssdk.services.ivs.model.GetChannelRequest;
import software.amazon.awssdk.services.ivs.model.GetStreamRequest;
import software.amazon.awssdk.services.ivs.model.Stream;

@Slf4j
public class AwsIvsPlaybackUrlResolver implements IvsPlaybackUrlResolver {

    private final IvsClient ivsClient;

    public AwsIvsPlaybackUrlResolver(IvsClient ivsClient) {
        this.ivsClient = ivsClient;
    }

    @Override
    public String getPlaybackUrl(String channelArn) {
        if (channelArn == null || channelArn.isBlank()) {
            return null;
        }
        // 1) GetStream: 스트림이 LIVE일 때만 playbackUrl 반환
        try {
            Stream stream = ivsClient.getStream(GetStreamRequest.builder().channelArn(channelArn).build()).stream();
            String url = stream != null ? stream.playbackUrl() : null;
            if (url != null && !url.isBlank()) {
                return url;
            }
        } catch (Exception e) {
            log.debug("IVS GetStream failed for channelArn={}: {}", channelArn, e.getMessage());
        }

        // 2) Fallback: GetChannel - 채널의 고정 playbackUrl (스트림 LIVE 시 동일 URL로 재생 가능)
        try {
            Channel channel = ivsClient.getChannel(GetChannelRequest.builder().arn(channelArn).build()).channel();
            String url = channel != null ? channel.playbackUrl() : null;
            if (url != null && !url.isBlank()) {
                log.info("IVS GetStream returned null, using GetChannel playbackUrl for channelArn={}", channelArn);
                return url;
            }
        } catch (Exception e) {
            log.warn("IVS GetChannel failed for channelArn={}: {}", channelArn, e.getMessage());
        }

        return null;
    }
}
