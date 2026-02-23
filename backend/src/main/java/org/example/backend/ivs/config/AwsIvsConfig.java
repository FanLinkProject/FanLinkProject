package org.example.backend.ivs.config;

import org.example.backend.ivs.client.AwsIvsPlaybackClient;
import org.example.backend.ivs.client.AwsIvsPlaybackUrlResolver;
import org.example.backend.ivs.client.AwsSdkIvsPlaybackClient;
import org.example.backend.ivs.client.IvsPlaybackUrlResolver;
import org.example.backend.ivs.util.IvsPlaybackTokenSigner;
import org.example.backend.media_asset.config.AwsProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ivs.IvsClient;

import java.security.PrivateKey;

@Configuration
@ConditionalOnProperty(prefix = "ivs.playback-auth", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(IvsPlaybackAuthProperties.class)
public class AwsIvsConfig {

    @Bean
    public IvsPlaybackTokenSigner ivsPlaybackTokenSigner() {
        return new IvsPlaybackTokenSigner();
    }

    @Bean
    public PrivateKey ivsPlaybackPrivateKey(IvsPlaybackAuthProperties properties,
                                            IvsPlaybackTokenSigner signer) {
        String path = properties.getPrivateKeyPath();
        if (path != null && !path.isBlank()) {
            return signer.loadEcPrivateKeyFromPath(path);
        }
        throw new IllegalArgumentException("IVS private key가 설정되지 않았습니다.");
    }

    @Bean
    public AwsIvsPlaybackClient awsIvsPlaybackClient(IvsPlaybackTokenSigner signer, PrivateKey privateKey) {
        return new AwsSdkIvsPlaybackClient(signer, privateKey);
    }

    @Bean
    public IvsClient ivsClient(AwsProperties awsProperties) {
        return IvsClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.builder().build())
                .build();
    }

    @Bean
    public IvsPlaybackUrlResolver ivsPlaybackUrlResolver(IvsClient ivsClient) {
        return new AwsIvsPlaybackUrlResolver(ivsClient);
    }
}
