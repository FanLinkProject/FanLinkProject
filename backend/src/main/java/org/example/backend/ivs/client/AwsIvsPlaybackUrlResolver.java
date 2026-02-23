package org.example.backend.ivs.client;

import software.amazon.awssdk.services.ivs.IvsClient;
import software.amazon.awssdk.services.ivs.model.GetStreamRequest;
import software.amazon.awssdk.services.ivs.model.Stream;

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
            return stream != null ? stream.playbackUrl() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
