package org.example.backend.music_video.util;

import org.example.backend.music_video.exception.MusicVideoErrorCode;
import org.example.backend.music_video.exception.MusicVideoException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class YoutubeUrlParser {

    private static final Pattern VIDEO_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{11}$");

    // 유튜브 URL에서 videoId를 파싱하고 검증한다.
    public String parseVideoId(String url) {
        if (url == null || url.isBlank()) {
            throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
        }
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
        }

        String host = uri.getHost();
        if (host == null) {
            throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
        }
        host = host.toLowerCase();

        String videoId;
        if (host.equals("youtu.be")) {
            videoId = extractFromPath(uri.getPath());
        } else if (host.equals("www.youtube.com") || host.equals("youtube.com")) {
            String path = uri.getPath();
            if (path != null && path.startsWith("/watch")) {
                videoId = extractFromQuery(uri.getRawQuery(), "v");
            } else if (path != null && path.startsWith("/shorts/")) {
                videoId = path.substring("/shorts/".length());
            } else {
                throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
            }
        } else {
            throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
        }

        if (videoId == null || !VIDEO_ID_PATTERN.matcher(videoId).matches()) {
            throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
        }
        return videoId;
    }

    // youtu.be/{id} 형태에서 id를 추출한다.
    private String extractFromPath(String path) {
        if (path == null || path.isBlank()) {
            throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
        }
        String trimmed = path.startsWith("/") ? path.substring(1) : path;
        if (trimmed.contains("/")) {
            trimmed = trimmed.substring(0, trimmed.indexOf('/'));
        }
        return trimmed;
    }

    // watch?v= 형태에서 v 파라미터를 추출한다.
    private String extractFromQuery(String rawQuery, String key) {
        if (rawQuery == null || rawQuery.isBlank()) {
            throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
        }
        Map<String, String> params = parseQuery(rawQuery);
        String value = params.get(key);
        if (value == null || value.isBlank()) {
            throw new MusicVideoException(MusicVideoErrorCode.INVALID_YOUTUBE_URL);
        }
        return value;
    }

    // 쿼리 스트링을 key-value 맵으로 변환한다.
    private Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> result = new HashMap<>();
        String[] pairs = rawQuery.split("&");
        for (String pair : pairs) {
            if (pair.isBlank()) {
                continue;
            }
            int idx = pair.indexOf('=');
            if (idx <= 0) {
                continue;
            }
            String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
            String value = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
            result.put(key, value);
        }
        return result;
    }
}
