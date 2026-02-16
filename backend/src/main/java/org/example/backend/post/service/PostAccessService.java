package org.example.backend.post.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.media_asset.entity.MediaAssetScope;
import org.example.backend.post.dto.response.PostAccessResponse;
import org.example.backend.post.dto.response.PostAccessResult;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.post.entity.PostMediaAsset;
import org.example.backend.post.entity.PostMediaAssetType;
import org.example.backend.post.exception.PostErrorCode;
import org.example.backend.post.exception.PostException;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.post.repository.PostMediaAssetRepository;
import org.example.backend.replay.util.CloudFrontCookieSigner;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostAccessService {

    private static final Duration PAID_POST_TTL = Duration.ofMinutes(10);

    private final ArtistPostRepository artistPostRepository;
    private final PostMediaAssetRepository postMediaAssetRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final AwsProperties awsProperties;
    private final ObjectProvider<CloudFrontCookieSigner> cookieSignerProvider;
    private final StringRedisTemplate redisTemplate;

    // 유료 게시물 첨부 접근을 위한 Signed Cookie를 발급한다.
    public PostAccessResult issueAccessCookie(Long postId, Long userId, UserRole role) {
        if (userId == null || role == null) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }
        ArtistPost post = artistPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));
        if (Boolean.TRUE.equals(post.getStatus())) {
            throw new PostException(PostErrorCode.POST_NOT_FOUND);
        }
        if (!Boolean.TRUE.equals(post.getIsMembershipOnly())) {
            throw new PostException(PostErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }

        Long artistId = resolveArtistId(post);
        if (!canAccessPaidPost(post, userId, role, artistId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository
                .findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, postId);
        boolean hasRestricted = attachments.stream()
                .anyMatch(asset -> asset.getMediaAsset().getScope() == MediaAssetScope.RESTRICTED);
        if (!hasRestricted) {
            throw new PostException(PostErrorCode.MEDIA_ASSET_NOT_FOUND);
        }

        String domain = awsProperties.getCloudfront().getDomain();
        String pathPattern = buildRestrictedPostPathPattern(domain, postId);
        String cacheKey = buildCacheKey(userId, postId);
        PostAccessResult cached = readCachedResult(cacheKey, postId, pathPattern);
        if (cached != null) {
            return cached;
        }

        CloudFrontCookieSigner cookieSigner = cookieSignerProvider.getIfAvailable();
        if (cookieSigner == null) {
            throw new PostException(PostErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
        List<String> cookies = cookieSigner.issueSignedCookies(pathPattern, PAID_POST_TTL);

        PostAccessResponse response = new PostAccessResponse(
                postId,
                pathPattern,
                Instant.now().plusSeconds(PAID_POST_TTL.getSeconds())
        );
        PostAccessResult result = new PostAccessResult(response, cookies);
        cacheResult(cacheKey, result);
        return result;
    }

    private Long resolveArtistId(ArtistPost post) {
        User group = post.getGroup();
        return group != null ? group.getId() : post.getUser().getId();
    }

    private boolean canAccessPaidPost(ArtistPost post, Long userId, UserRole role, Long artistId) {
        if (role == UserRole.ADMIN) {
            return true;
        }
        if (role == UserRole.ARTIST) {
            return post.getUser().getId().equals(userId)
                    || (post.getGroup() != null && post.getGroup().getId().equals(userId));
        }
        return subscriptionRepository.existsActiveSubscriptionForArtist(userId, artistId, Instant.now());
    }

    private String buildRestrictedPostPathPattern(String cloudfrontDomain, Long postId) {
        if (cloudfrontDomain == null || cloudfrontDomain.isBlank()) {
            throw new PostException(PostErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
        String domain = cloudfrontDomain.replace("https://", "").replace("http://", "").trim();
        return "https://" + domain + "/restricted/posts/*/" + postId + "/*";
    }

    private String buildCacheKey(Long userId, Long postId) {
        return "post-access:" + userId + ":" + postId;
    }

    private void cacheResult(String cacheKey, PostAccessResult result) {
        if (cacheKey == null || result == null || result.setCookieHeaders() == null) {
            return;
        }
        StringBuilder builder = new StringBuilder();
        builder.append(result.response().expiresAt().toEpochMilli());
        for (String cookie : result.setCookieHeaders()) {
            builder.append('\n').append(cookie);
        }
        redisTemplate.opsForValue().set(cacheKey, builder.toString(), PAID_POST_TTL);
    }

    private PostAccessResult readCachedResult(String cacheKey, Long postId, String pathPattern) {
        if (cacheKey == null) {
            return null;
        }
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached == null || cached.isBlank()) {
            return null;
        }
        String[] lines = cached.split("\n");
        if (lines.length < 2) {
            return null;
        }
        Instant expiresAt;
        try {
            expiresAt = Instant.ofEpochMilli(Long.parseLong(lines[0].trim()));
        } catch (NumberFormatException ex) {
            return null;
        }
        List<String> cookies = new ArrayList<>();
        for (int i = 1; i < lines.length; i++) {
            if (!lines[i].isBlank()) {
                cookies.add(lines[i]);
            }
        }
        if (cookies.isEmpty()) {
            return null;
        }
        PostAccessResponse response = new PostAccessResponse(postId, pathPattern, expiresAt);
        return new PostAccessResult(response, cookies);
    }
}
