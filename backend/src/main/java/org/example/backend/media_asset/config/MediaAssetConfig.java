package org.example.backend.media_asset.config;

import org.example.backend.media_asset.metadata.NoopVideoMetadataExtractor;
import org.example.backend.media_asset.metadata.VideoMetadataExtractor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
@EnableScheduling
@EnableJpaAuditing
@EnableConfigurationProperties({AwsProperties.class, MediaProperties.class})
public class MediaAssetConfig {

    @Bean
    // AWS S3 SDK 클라이언트를 생성한다.
    public S3Client s3Client(AwsProperties awsProperties) {
        return S3Client.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    @Bean
    // presigned URL 생성용 S3Presigner를 생성한다.
    public S3Presigner s3Presigner(AwsProperties awsProperties) {
        return S3Presigner.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    @Bean
    // 미디어 도메인에서 사용할 기준 시계를 제공한다(Asia/Seoul).
    public Clock mediaClock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }

    @Bean
    // Sp-2 확장 전 기본 메타데이터 추출 구현체를 등록한다.
    public VideoMetadataExtractor videoMetadataExtractor() {
        return new NoopVideoMetadataExtractor();
    }
}
