package org.example.backend.music_video.service;

import org.example.backend.music_video.exception.MusicVideoErrorCode;
import org.example.backend.music_video.exception.MusicVideoException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class YoutubeVideoVerifier {

    private final RestTemplate restTemplate;

    @Value("${youtube.api-key:}")
    private String apiKey;

    @Value("${youtube.validation.enabled:true}")
    private boolean validationEnabled;

    @Value("${youtube.validation.cache.enabled:true}")
    private boolean cacheEnabled;

    @Value("${youtube.validation.cache-ttl-seconds:600}")
    private long cacheTtlSeconds;

    public YoutubeVideoVerifier(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // YouTube Data API로 영상 존재/공개 상태를 검증한다.
    public void validateExists(String videoId) {
        if (!validationEnabled) {
            return;
        }
        CacheEntry cached = getCached(videoId);
        if (cached != null) {
            if (cached.isValid) {
                return;
            }
            throw new MusicVideoException(MusicVideoErrorCode.YOUTUBE_VIDEO_NOT_FOUND);
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new MusicVideoException(MusicVideoErrorCode.YOUTUBE_API_KEY_MISSING);
        }
        try {
            String url = UriComponentsBuilder.fromUriString("https://www.googleapis.com/youtube/v3/videos")
                    .queryParam("part", "status")
                    .queryParam("id", videoId)
                    .queryParam("key", apiKey)
                    .build()
                    .toUriString();

            YoutubeVideoApiResponse response = restTemplate.getForObject(url, YoutubeVideoApiResponse.class);
            if (response == null || response.items == null || response.items.isEmpty()) {
                putCache(videoId, false);
                throw new MusicVideoException(MusicVideoErrorCode.YOUTUBE_VIDEO_NOT_FOUND);
            }
            YoutubeVideoStatus status = response.items.get(0).status;
            if (status == null || status.privacyStatus == null) {
                putCache(videoId, false);
                throw new MusicVideoException(MusicVideoErrorCode.YOUTUBE_VIDEO_NOT_FOUND);
            }
            String privacy = status.privacyStatus.toLowerCase();
            if (!privacy.equals("public") && !privacy.equals("unlisted")) {
                putCache(videoId, false);
                throw new MusicVideoException(MusicVideoErrorCode.YOUTUBE_VIDEO_NOT_FOUND);
            }
            putCache(videoId, true);
        } catch (RestClientException e) {
            throw new MusicVideoException(MusicVideoErrorCode.YOUTUBE_API_FAILED, "YouTube API 호출 실패: " + e.getMessage());
        }
    }

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    // 캐시된 검증 결과를 조회한다.
    private CacheEntry getCached(String videoId) {
        if (!cacheEnabled) {
            return null;
        }
        CacheEntry entry = cache.get(videoId);
        if (entry == null) {
            return null;
        }
        if (entry.expiresAtMillis < System.currentTimeMillis()) {
            cache.remove(videoId);
            return null;
        }
        return entry;
    }

    // 검증 결과를 캐시에 저장한다.
    private void putCache(String videoId, boolean isValid) {
        if (!cacheEnabled) {
            return;
        }
        long expiresAt = System.currentTimeMillis() + (cacheTtlSeconds * 1000);
        cache.put(videoId, new CacheEntry(isValid, expiresAt));
    }

    private record CacheEntry(boolean isValid, long expiresAtMillis) {
    }

    private static class YoutubeVideoApiResponse {
        private List<YoutubeVideoItem> items;
    }

    private static class YoutubeVideoItem {
        private YoutubeVideoStatus status;
    }

    private static class YoutubeVideoStatus {
        private String privacyStatus;
    }
}
