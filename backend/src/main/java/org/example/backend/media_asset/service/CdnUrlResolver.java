package org.example.backend.media_asset.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.config.AwsProperties;
import org.springframework.stereotype.Component;

/**
 * CloudFront CDN URL 생성을 위한 공용 컴포넌트.
 * 모든 서비스/DTO에서 이 클래스만 사용하여 CDN URL을 구성한다.
 */
@Component
@RequiredArgsConstructor
public class CdnUrlResolver {

    private final AwsProperties awsProperties;

    /**
     * objectKey로부터 전체 CDN URL을 생성한다.
     * 예: "public/profiles/45/uuid.png" → "https://d1234.cloudfront.net/public/profiles/45/uuid.png"
     */
    public String resolve(String objectKey) {
        String base = getBaseUrl();
        if (base == null || objectKey == null || objectKey.isBlank()) {
            return null;
        }
        return base + "/" + (objectKey.startsWith("/") ? objectKey.substring(1) : objectKey);
    }

    /**
     * CDN 베이스 URL을 반환한다. (DTO의 cdnBaseUrl 파라미터로 전달용)
     * 예: "https://d1234.cloudfront.net"
     * @return 베이스 URL 또는 null (CloudFront 미설정 시)
     */
    public String getBaseUrl() {
        if (awsProperties.getCloudfront() == null) {
            return null;
        }
        String domain = awsProperties.getCloudfront().getDomain();
        if (domain == null || domain.isBlank()) {
            return null;
        }
        String normalized = domain.trim();
        if (normalized.startsWith("https://")) {
            normalized = normalized.substring("https://".length());
        } else if (normalized.startsWith("http://")) {
            normalized = normalized.substring("http://".length());
        }
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return "https://" + normalized;
    }
}
