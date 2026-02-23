package org.example.backend.ivs.client;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.services.ivs.IvsClient;
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
        try {
            Stream stream = ivsClient.getStream(GetStreamRequest.builder().channelArn(channelArn).build()).stream();
            String url = stream != null ? stream.playbackUrl() : null;
            if (url != null && !url.isBlank()) {
                return url;
            }
        } catch (Exception e) {
            log.debug("IVS GetStream failed for channelArn={}: {}", channelArn, e.getMessage());
        }
        return null;
    }
}
