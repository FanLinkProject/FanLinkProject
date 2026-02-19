package org.example.backend.media_asset.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "media")
public class MediaProperties {

    private Presign presign = new Presign();
    private Orphan orphan = new Orphan();
    private OrphanCleanup orphanCleanup = new OrphanCleanup();
    private Limits limits = new Limits();
    private Attachments attachments = new Attachments();
    private Metadata metadata = new Metadata();

    @Getter
    @Setter
    public static class Presign {
        private long expireSeconds = 600;
    }

    @Getter
    @Setter
    public static class Orphan {
        private long expiresMinutes = 30;
    }

    @Getter
    @Setter
    public static class OrphanCleanup {
        private long fixedDelayMs = 600_000;
    }

    @Getter
    @Setter
    public static class Limits {
        private long imageBytes = 10L * 1024 * 1024;
        private long postVideoBytes = 1L * 1024 * 1024 * 1024;
        private long replayVideoBytes = 5L * 1024 * 1024 * 1024;
        private long postVideoMaxDurationSeconds = 600;
        private long replayVideoMaxDurationSeconds = 7200;
    }

    @Getter
    @Setter
    public static class Attachments {
        private int maxPerPost = 5;
        private int maxPerProductImages = 5;
    }

    @Getter
    @Setter
    public static class Metadata {
        private boolean enabled = false;
        private String ffprobePath;
        private long ffprobeTimeoutSeconds = 20;
    }
}
