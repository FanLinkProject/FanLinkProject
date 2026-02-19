package org.example.backend.ivs.config;

import org.example.backend.ivs.client.AwsIvsPlaybackClient;
import org.example.backend.ivs.client.AwsSdkIvsPlaybackClient;
import org.example.backend.ivs.util.IvsPlaybackTokenSigner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.PrivateKey;

@Configuration
@ConditionalOnProperty(prefix = "ivs.playback-auth", name = "enabled", havingValue = "true")
@EnableConfigurationProperties(IvsPlaybackAuthProperties.class)
public class AwsIvsConfig {

    // IVS Playback Authorization 서명 유틸을 생성한다.
    @Bean
    public IvsPlaybackTokenSigner ivsPlaybackTokenSigner() {
        return new IvsPlaybackTokenSigner();
    }

    // IVS Playback Authorization 서명용 PrivateKey를 생성한다.
    @Bean
    public PrivateKey ivsPlaybackPrivateKey(IvsPlaybackAuthProperties properties,
                                            IvsPlaybackTokenSigner signer) {
        String path = properties.getPrivateKeyPath();
        if (path != null && !path.isBlank()) {
            return signer.loadEcPrivateKeyFromPath(path);
        }
        throw new IllegalArgumentException("IVS private key가 설정되지 않았습니다.");
    }

    // IVS Playback Token 발급 클라이언트를 생성한다.
    @Bean
    public AwsIvsPlaybackClient awsIvsPlaybackClient(IvsPlaybackTokenSigner signer, PrivateKey privateKey) {
        return new AwsSdkIvsPlaybackClient(signer, privateKey);
    }
}
