package org.example.backend.replay.config;

import org.example.backend.media_asset.config.AwsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

@Configuration
@ConditionalOnProperty(prefix = "mediaconvert.events", name = "enabled", havingValue = "true")
public class MediaConvertEventConfig {

    @Bean
    // MediaConvert 이벤트 처리용 SQS 클라이언트를 생성한다.
    public SqsClient mediaConvertSqsClient(AwsProperties awsProperties) {
        return SqsClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.builder().build())
                .build();
    }
}
