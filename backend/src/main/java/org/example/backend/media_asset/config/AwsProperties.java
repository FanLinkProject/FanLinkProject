package org.example.backend.media_asset.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "aws")
public class AwsProperties {

    private String region;
    private S3 s3 = new S3();
    private Cloudfront cloudfront = new Cloudfront();

    @Getter
    @Setter
    public static class S3 {
        private String bucketName;
    }

    @Getter
    @Setter
    public static class Cloudfront {
        private String domain;
        private String keyPairId;
        private String privateKeyPath;
    }
}
