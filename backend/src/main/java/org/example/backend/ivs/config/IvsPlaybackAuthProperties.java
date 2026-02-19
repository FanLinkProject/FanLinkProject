package org.example.backend.ivs.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "ivs.playback-auth")
public class IvsPlaybackAuthProperties {

    // IVS Playback Authorization 사용 여부를 설정한다.
    private boolean enabled;

    // PEM 파일 경로를 보관한다.
    private String privateKeyPath;
}
