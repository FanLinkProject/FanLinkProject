package org.example.backend.ivs.config;

import org.example.backend.media_asset.config.AwsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
@ConditionalOnProperty(prefix = "ivs.recording-events", name = "enabled", havingValue = "true")
public class IvsRecordingEventConfig {

    @Bean
    // IVS 녹화 이벤트 처리를 위한 SQS 클라이언트를 생성한다.
    public SqsClient ivsRecordingSqsClient(AwsProperties awsProperties) {
        return SqsClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.builder().build())
                .build();
    }
}
