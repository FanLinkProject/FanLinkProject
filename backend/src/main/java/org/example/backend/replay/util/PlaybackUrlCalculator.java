package org.example.backend.replay.util;

import org.example.backend.replay.entity.Replay;
import org.springframework.stereotype.Component;

@Component
public class PlaybackUrlCalculator {

    /**
     * 재생 URL을 계산한다.
     * 수동 업로드 등으로 HLS/녹화 prefix가 없으면 null 반환.
     */
    public String buildPlaybackUrl(String cloudfrontDomain, Replay replay) {
        String domain = normalizeDomain(cloudfrontDomain);
        if (replay.getHlsMasterManifestKey() != null && !replay.getHlsMasterManifestKey().isBlank()) {
            return "https://" + domain + "/" + trimLeadingSlash(replay.getHlsMasterManifestKey());
        }
        String prefix = replay.getRecordingS3Prefix();
        if (prefix == null || prefix.isBlank()) {
            return null;
        }
        return "https://" + domain + "/" + trimTrailingSlash(prefix) + "/master.m3u8";
    }

    /**
     * Signed Cookie 리소스 패턴을 계산한다.
     * 재생 가능한 prefix가 없으면 null 반환.
     */
    public String buildPlaybackPathPattern(String cloudfrontDomain, Replay replay) {
        String domain = normalizeDomain(cloudfrontDomain);
        String prefix = replay.getRecordingS3Prefix();
        if (replay.getHlsMasterManifestKey() != null && !replay.getHlsMasterManifestKey().isBlank()) {
            prefix = extractPrefix(replay.getHlsMasterManifestKey());
        }
        if (prefix == null || prefix.isBlank()) {
            return null;
        }
        return "https://" + domain + "/" + trimTrailingSlash(prefix) + "/*";
    }

    // 도메인 문자열을 정규화한다.
    private String normalizeDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            throw new IllegalArgumentException("CloudFront 도메인이 필요합니다.");
        }
        return domain.replace("https://", "").replace("http://", "").trim();
    }

    // 앞의 슬래시를 제거한다.
    private String trimLeadingSlash(String value) {
        if (value == null) {
            return "";
        }
        return value.startsWith("/") ? value.substring(1) : value;
    }

    // 뒤의 슬래시를 제거한다.
    private String trimTrailingSlash(String value) {
        if (value == null) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    // 키에서 prefix를 추출한다.
    private String extractPrefix(String key) {
        String normalized = trimLeadingSlash(key);
        int idx = normalized.lastIndexOf('/');
        if (idx < 0) {
            return normalized;
        }
        return normalized.substring(0, idx);
    }

}
