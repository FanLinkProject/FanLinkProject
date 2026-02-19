package org.example.backend.post.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.post.dto.request.ArtistPostRequest;
import org.example.backend.post.dto.response.ArtistPostResponse;
import org.example.backend.post.dto.response.PostMediaAssetResponse;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.post.entity.PostMediaAsset;
import org.example.backend.post.entity.PostMediaAssetType;
import org.example.backend.post.exception.PostErrorCode;
import org.example.backend.post.exception.PostException;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.post.repository.PostMediaAssetRepository;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.example.backend.user.service.ArtistPermissionService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArtistPostService {

    private final ArtistPostRepository artistPostRepository;
    private final UserRepository userRepository;
    private final PostMediaAssetRepository postMediaAssetRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final AwsProperties awsProperties;
    private final SubscriptionRepository subscriptionRepository;
    private final ArtistPermissionService artistPermissionService;

    private String getCdnBaseUrl() {
        String domain = awsProperties.getCloudfront() != null ? awsProperties.getCloudfront().getDomain() : null;
        if (domain == null || domain.isBlank()) {
            return null;
        }
        return domain.startsWith("http") ? domain : "https://" + domain;
    }

    private List<MediaAsset> validateAndFetchMediaAssets(Long userId, List<Long> mediaAssetIds) {
        if (CollectionUtils.isEmpty(mediaAssetIds)) {
            return Collections.emptyList();
        }
        List<MediaAsset> assets = new ArrayList<>();
        for (Long id : mediaAssetIds) {
            MediaAsset asset = mediaAssetRepository.findById(id)
                    .orElseThrow(() -> new PostException(PostErrorCode.MEDIA_ASSET_NOT_FOUND));
            if (!asset.getOwnerUserId().equals(userId)) {
                throw new PostException(PostErrorCode.MEDIA_ASSET_ACCESS_DENIED);
            }
            if (asset.getStatus() != MediaAssetStatus.READY) {
                throw new PostException(PostErrorCode.MEDIA_ASSET_NOT_READY);
            }
            if (asset.getCategory() != MediaAssetCategory.POST_IMAGE && asset.getCategory() != MediaAssetCategory.POST_VIDEO) {
                throw new PostException(PostErrorCode.INVALID_MEDIA_ASSET_CATEGORY);
            }
            assets.add(asset);
        }
        return assets;
    }

    private List<PostMediaAssetResponse> buildAttachmentResponses(List<PostMediaAsset> postMediaAssets) {
        if (CollectionUtils.isEmpty(postMediaAssets)) {
            return Collections.emptyList();
        }
        String cdnBaseUrl = getCdnBaseUrl();
        return postMediaAssets.stream()
                .map(pma -> PostMediaAssetResponse.from(pma.getMediaAsset(), cdnBaseUrl))
                .collect(Collectors.toList());
    }

    @Transactional
    public ArtistPostResponse createPost(Long userId, ArtistPostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new PostException(PostErrorCode.USER_NOT_FOUND));

        if (user.getRole() == UserRole.USER) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }
        if (!artistPermissionService.isManageAccount(userId, user.getRole())) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        validateRepresentativeMediaAssetId(request.getMediaAssetIds(), request.getRepresentativeMediaAssetId());

        User group = null;
        if (request.getGroupId() != null) {
            group = userRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new PostException(PostErrorCode.GROUP_NOT_FOUND));
        }

        ArtistPost artistPost = ArtistPost.builder()
                .user(user)
                .group(group)
                .title(request.getTitle())
                .content(request.getContent())
                .isMembershipOnly(request.getIsMembershipOnly())
                .status(false)
                .representativeMediaAssetId(request.getRepresentativeMediaAssetId())
                .build();

        ArtistPost savedPost = artistPostRepository.save(artistPost);

        List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(userId, request.getMediaAssetIds());
        for (MediaAsset asset : mediaAssets) {
            postMediaAssetRepository.save(new PostMediaAsset(PostMediaAssetType.ARTIST, savedPost.getId(), asset));
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, savedPost.getId());
        return ArtistPostResponse.from(savedPost, buildAttachmentResponses(attachments));
    }

    public ArtistPostResponse getPost(Long id, Long userId, UserRole role) {
        ArtistPost artistPost = artistPostRepository.findById(id)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (artistPost.getStatus()) {
            throw new PostException(PostErrorCode.POST_NOT_FOUND);
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository
                .findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, artistPost.getId());
        return buildPostResponseWithAccess(artistPost, attachments, userId, role, false);
    }

    public List<ArtistPostResponse> getPosts(Long groupId, Long lastPostId, int limit, Long userId, UserRole role) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findPosts(groupId, lastPostId, pageable).stream()
                .map(post -> buildPostResponseWithAccess(post,
                        postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, post.getId()),
                        userId, role, true))
                .collect(Collectors.toList());
    }

    public List<ArtistPostResponse> getNotices(Long lastPostId, int limit, Long userId, UserRole role) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findNotices(lastPostId, pageable).stream()
                .map(post -> buildPostResponseWithAccess(post,
                        postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, post.getId()),
                        userId, role, true))
                .collect(Collectors.toList());
    }

    public List<ArtistPostResponse> getArtistPosts(Long groupId, Long lastPostId, int limit, Long userId, UserRole role) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findArtistPosts(groupId, lastPostId, pageable).stream()
                .map(post -> buildPostResponseWithAccess(post,
                        postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, post.getId()),
                        userId, role, true))
                .collect(Collectors.toList());
    }

    @Transactional
    public ArtistPostResponse updatePost(Long userId, Long postId, ArtistPostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new PostException(PostErrorCode.USER_NOT_FOUND));
        if (!artistPermissionService.isManageAccount(userId, user.getRole())) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        ArtistPost artistPost = artistPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        boolean isWriter = artistPost.getUser().getId().equals(userId);
        boolean isGroupOwner = artistPost.getGroup() != null && artistPost.getGroup().getId().equals(userId);
        if (!isWriter && !isGroupOwner) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        Long newRepresentativeId = null;
        if (request.getMediaAssetIds() != null) {
            validateRepresentativeMediaAssetId(request.getMediaAssetIds(), request.getRepresentativeMediaAssetId());
            newRepresentativeId = request.getRepresentativeMediaAssetId();
        } else {
            newRepresentativeId = artistPost.getRepresentativeMediaAssetId();
        }

        artistPost.update(request.getTitle(), request.getContent(), request.getIsMembershipOnly(), newRepresentativeId);

        if (request.getMediaAssetIds() != null) {
            postMediaAssetRepository.deleteAllByPostTypeAndPostId(PostMediaAssetType.ARTIST, postId);
            if (!request.getMediaAssetIds().isEmpty()) {
                List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(userId, request.getMediaAssetIds());
                for (MediaAsset asset : mediaAssets) {
                    postMediaAssetRepository.save(new PostMediaAsset(PostMediaAssetType.ARTIST, postId, asset));
                }
            }
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, postId);
        return ArtistPostResponse.from(artistPost, buildAttachmentResponses(attachments));
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {
        ArtistPost artistPost = artistPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (!artistPost.getUser().getId().equals(userId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        artistPost.delete();
    }

    private ArtistPostResponse buildPostResponseWithAccess(ArtistPost post, List<PostMediaAsset> attachments,
                                                          Long userId, UserRole role, boolean onlyRepresentative) {
        List<PostMediaAssetResponse> attachmentResponses = onlyRepresentative
                ? buildRepresentativeAttachmentResponses(post, attachments)
                : buildAttachmentResponses(attachments);
        if (!Boolean.TRUE.equals(post.getIsMembershipOnly())) {
            return ArtistPostResponse.from(post, attachmentResponses);
        }
        if (canAccessPaidPost(post, userId, role)) {
            return ArtistPostResponse.from(post, attachmentResponses);
        }
        return ArtistPostResponse.builder()
                .id(post.getId())
                .writerId(post.getUser().getId())
                .writerNickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(null)
                .isMembershipOnly(post.getIsMembershipOnly())
                .representativeMediaAssetId(post.getRepresentativeMediaAssetId())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .attachments(Collections.emptyList())
                .build();
    }

    private void validateRepresentativeMediaAssetId(List<Long> mediaAssetIds, Long representativeMediaAssetId) {
        if (representativeMediaAssetId == null) {
            return;
        }
        if (CollectionUtils.isEmpty(mediaAssetIds) || !mediaAssetIds.contains(representativeMediaAssetId)) {
            throw new PostException(PostErrorCode.INVALID_MEDIA_ASSET_CATEGORY);
        }
    }

    private List<PostMediaAssetResponse> buildRepresentativeAttachmentResponses(ArtistPost post, List<PostMediaAsset> attachments) {
        if (CollectionUtils.isEmpty(attachments)) {
            return Collections.emptyList();
        }
        String cdnBaseUrl = getCdnBaseUrl();
        Long repId = post.getRepresentativeMediaAssetId();
        if (repId != null) {
            for (PostMediaAsset pma : attachments) {
                MediaAsset ma = pma.getMediaAsset();
                if (ma != null && repId.equals(ma.getId())) {
                    return List.of(PostMediaAssetResponse.from(ma, cdnBaseUrl));
                }
            }
        }
        return List.of(PostMediaAssetResponse.from(attachments.get(0).getMediaAsset(), cdnBaseUrl));
    }

    private boolean canAccessPaidPost(ArtistPost post, Long userId, UserRole role) {
        if (userId == null || role == null) {
            return false;
        }
        if (role == UserRole.ADMIN) {
            return true;
        }
        if (role == UserRole.ARTIST) {
            return post.getUser().getId().equals(userId)
                    || (post.getGroup() != null && post.getGroup().getId().equals(userId));
        }
        Long artistId = post.getGroup() != null ? post.getGroup().getId() : post.getUser().getId();
        return subscriptionRepository.existsActiveSubscriptionForArtist(userId, artistId, Instant.now());
    }
}
