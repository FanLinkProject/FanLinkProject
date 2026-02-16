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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

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
        return new PostAccessResult(response, cookies);
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
}
