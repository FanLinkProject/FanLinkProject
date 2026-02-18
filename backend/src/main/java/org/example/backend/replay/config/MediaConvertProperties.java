package org.example.backend.replay.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "mediaconvert")
public class MediaConvertProperties {

    private boolean enabled = false;
    private String endpoint;
    private String roleArn;
    private String jobTemplate;
    private String queueArn;
    private String outputPrefix = "derived/replays";
    private String outputSubpath = "cmaf";
    private String masterManifest = "master.m3u8";
    private final Events events = new Events();

    @Getter
    @Setter
    public static class Events {
        private boolean enabled = false;
        private String queueUrl;
        private int maxMessages = 5;
        private int waitSeconds = 10;
        private int visibilityTimeoutSeconds = 30;
        private long pollFixedDelayMs = 5000;
    }
}
