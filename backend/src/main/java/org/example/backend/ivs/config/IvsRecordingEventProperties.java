package org.example.backend.ivs.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "ivs.recording-events")
public class IvsRecordingEventProperties {

    private boolean enabled = false;
    private String queueUrl;
    private int maxMessages = 5;
    private int waitSeconds = 10;
    private int visibilityTimeoutSeconds = 30;
    private long pollFixedDelayMs = 5000;
}
