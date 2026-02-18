package org.example.backend.replay.config;

import org.example.backend.media_asset.config.AwsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClientBuilder;

import java.net.URI;

@Configuration
@ConditionalOnProperty(prefix = "mediaconvert", name = "enabled", havingValue = "true")
public class MediaConvertConfig {

    @Bean
    // MediaConvert 클라이언트를 생성한다.
    public MediaConvertClient mediaConvertClient(MediaConvertProperties properties, AwsProperties awsProperties) {
        MediaConvertClientBuilder builder = MediaConvertClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.builder().build());
        if (properties.getEndpoint() != null && !properties.getEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(properties.getEndpoint()));
        }
        return builder.build();
    }
}
