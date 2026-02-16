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
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArtistPostService {

    private final ArtistPostRepository artistPostRepository;
    private final UserRepository userRepository;
    private final PostMediaAssetRepository postMediaAssetRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final AwsProperties awsProperties;

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
                .build();

        ArtistPost savedPost = artistPostRepository.save(artistPost);

        List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(userId, request.getMediaAssetIds());
        for (MediaAsset asset : mediaAssets) {
            postMediaAssetRepository.save(new PostMediaAsset(PostMediaAssetType.ARTIST, savedPost.getId(), asset));
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, savedPost.getId());
        return ArtistPostResponse.from(savedPost, buildAttachmentResponses(attachments));
    }

    public ArtistPostResponse getPost(Long id) {
        ArtistPost artistPost = artistPostRepository.findById(id)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (artistPost.getStatus()) {
            throw new PostException(PostErrorCode.POST_NOT_FOUND);
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, artistPost.getId());
        return ArtistPostResponse.from(artistPost, buildAttachmentResponses(attachments));
    }

    public List<ArtistPostResponse> getPosts(Long groupId, Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findPosts(groupId, lastPostId, pageable).stream()
                .map(ArtistPostResponse::from)
                .collect(Collectors.toList());
    }

    public List<ArtistPostResponse> getNotices(Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findNotices(lastPostId, pageable).stream()
                .map(ArtistPostResponse::from)
                .collect(Collectors.toList());
    }

    public List<ArtistPostResponse> getArtistPosts(Long groupId, Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findArtistPosts(groupId, lastPostId, pageable).stream()
                .map(ArtistPostResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public ArtistPostResponse updatePost(Long userId, Long postId, ArtistPostRequest request) {
        ArtistPost artistPost = artistPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (!artistPost.getUser().getId().equals(userId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        artistPost.update(request.getTitle(), request.getContent(), request.getIsMembershipOnly());

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
}
