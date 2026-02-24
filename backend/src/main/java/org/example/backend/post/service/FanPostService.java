package org.example.backend.post.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.media_asset.service.CdnUrlResolver;
import org.example.backend.post.dto.request.FanPostRequest;
import org.example.backend.post.dto.response.FanPostResponse;
import org.example.backend.post.dto.response.PostMediaAssetResponse;
import org.example.backend.post.entity.FanPost;
import org.example.backend.post.entity.PostMediaAsset;
import org.example.backend.post.entity.PostMediaAssetType;
import org.example.backend.post.exception.PostErrorCode;
import org.example.backend.post.exception.PostException;
import org.example.backend.comment.enums.TargetType;
import org.example.backend.comment.service.CommentService;
import org.example.backend.post.repository.FanPostRepository;
import org.example.backend.post.repository.PostMediaAssetRepository;
import org.example.backend.milestone.entity.FanProfile;
import org.example.backend.milestone.repository.FanProfileRepository;
import org.example.backend.milestone.service.FanProfileService;
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
public class FanPostService {

    private final FanPostRepository fanPostRepository;
    private final UserRepository userRepository;
    private final PostMediaAssetRepository postMediaAssetRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final CdnUrlResolver cdnUrlResolver;
    private final FanProfileService fanProfileService;
    private final FanProfileRepository fanProfileRepository;
    private final CommentService commentService;

    private String getCdnBaseUrl() {
        return cdnUrlResolver.getBaseUrl();
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

    /** 해당 그룹 기준 팬의 마일스톤 칭호명 반환 (없으면 null) */
    private String getWriterGradeName(Long fanUserId, Long groupId) {
        if (fanUserId == null || groupId == null) return null;
        return fanProfileRepository.findByFan_IdAndGroup_Id(fanUserId, groupId)
                .map(FanProfile::getGrade)
                .filter(g -> g != null && g.getMilestone() != null)
                .map(g -> g.getMilestone().getName())
                .orElse(null);
    }

    @Transactional
    public FanPostResponse createPost(Long userId, FanPostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new PostException(PostErrorCode.USER_NOT_FOUND));

        if (user.getRole() != UserRole.USER) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        User group = null;
        if (request.getGroupId() != null) {
            group = userRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new PostException(PostErrorCode.GROUP_NOT_FOUND));
        }

        FanPost fanPost = FanPost.builder()
                .user(user)
                .group(group)
                .title(request.getTitle())
                .content(request.getContent())
                .status(false)
                .build();

        FanPost savedPost = fanPostRepository.save(fanPost);

        // 게시물 생성 시 팬 프로필 게시글 수 증가
        if (group != null) {
            fanProfileRepository.findByFan_IdAndGroup_Id(userId, group.getId())
                    .map(FanProfile::getId)
                    .ifPresent(fanProfileService::increasePostCount);
        }

        List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(userId, request.getMediaAssetIds());
        for (MediaAsset asset : mediaAssets) {
            postMediaAssetRepository.save(new PostMediaAsset(PostMediaAssetType.FAN, savedPost.getId(), asset));
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.FAN, savedPost.getId());
        String gradeName = group != null ? getWriterGradeName(userId, group.getId()) : null;
        return FanPostResponse.from(savedPost, buildAttachmentResponses(attachments), gradeName);
    }

    public FanPostResponse getPost(Long id) {
        FanPost fanPost = fanPostRepository.findById(id)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (fanPost.getStatus()) { // 삭제된 게시글
            throw new PostException(PostErrorCode.POST_NOT_FOUND);
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.FAN, fanPost.getId());
        String gradeName = fanPost.getGroup() != null ? getWriterGradeName(fanPost.getUser().getId(), fanPost.getGroup().getId()) : null;
        return FanPostResponse.from(fanPost, buildAttachmentResponses(attachments), gradeName);
    }

    public List<FanPostResponse> getPosts(Long groupId, Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return fanPostRepository.findPosts(groupId, lastPostId, pageable).stream()
                .map(post -> {
                    List<PostMediaAsset> attachments = postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.FAN, post.getId());
                    String gradeName = post.getGroup() != null ? getWriterGradeName(post.getUser().getId(), post.getGroup().getId()) : null;
                    return FanPostResponse.from(post, buildAttachmentResponses(attachments), gradeName);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public FanPostResponse updatePost(Long userId, Long postId, FanPostRequest request) {
        FanPost fanPost = fanPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (!fanPost.getUser().getId().equals(userId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        fanPost.update(request.getTitle(), request.getContent());

        if (request.getMediaAssetIds() != null) {
            postMediaAssetRepository.deleteAllByPostTypeAndPostId(PostMediaAssetType.FAN, postId);
            if (!request.getMediaAssetIds().isEmpty()) {
                List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(userId, request.getMediaAssetIds());
                for (MediaAsset asset : mediaAssets) {
                    postMediaAssetRepository.save(new PostMediaAsset(PostMediaAssetType.FAN, postId, asset));
                }
            }
        }

        List<PostMediaAsset> attachments = postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.FAN, postId);
        String gradeName = fanPost.getGroup() != null ? getWriterGradeName(fanPost.getUser().getId(), fanPost.getGroup().getId()) : null;
        return FanPostResponse.from(fanPost, buildAttachmentResponses(attachments), gradeName);
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {
        FanPost fanPost = fanPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (!fanPost.getUser().getId().equals(userId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        // 게시글 삭제 시 팬 프로필 게시글 수 감소
        Long fanUserId = fanPost.getUser().getId();
        if (fanPost.getGroup() != null) {
            Long groupId = fanPost.getGroup().getId();
            fanProfileRepository.findByFan_IdAndGroup_Id(fanUserId, groupId)
                    .map(FanProfile::getId)
                    .ifPresent(fanProfileService::decreasePostCount);
        }

        fanPost.delete();
        commentService.deleteAllByTarget(TargetType.FAN, postId);
    }
}
