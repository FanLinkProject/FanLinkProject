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
import org.example.backend.comment.enums.TargetType;
import org.example.backend.comment.service.CommentService;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.entity.NotificationType;
import org.example.backend.notification.service.NotificationService;
import org.example.backend.order.enums.OrderStatus;
import org.example.backend.order.repository.OrderRepository;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.post.repository.PostMediaAssetRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.example.backend.user.service.ArtistPermissionService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ArtistPostService {

    private static final Logger log = LoggerFactory.getLogger(ArtistPostService.class);

    private final ArtistPostRepository artistPostRepository;
    private final UserRepository userRepository;
    private final PostMediaAssetRepository postMediaAssetRepository;
    private final MediaAssetRepository mediaAssetRepository;
    private final AwsProperties awsProperties;
    private final OrderRepository orderRepository;
    private final ArtistPermissionService artistPermissionService;
    private final GroupMemberRepository groupMemberRepository;
    private final CommentService commentService;
    private final NotificationService notificationService;

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
        // ADMIN: groupId 없이 서비스 공지 작성 허용
        if (user.getRole() != UserRole.ADMIN || request.getGroupId() != null) {
            if (!artistPermissionService.isManageAccount(userId, user.getRole())) {
                // 그룹 소속 ARTIST: 자신의 소속 그룹에 대해서만 포스트 작성 허용
                if (user.getRole() != UserRole.ARTIST
                        || request.getGroupId() == null
                        || !groupMemberRepository.existsByGroupIdAndMemberId(request.getGroupId(), userId)) {
                    throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
                }
            }
        }

        validateRepresentativeMediaAssetId(request.getMediaAssetIds(), request.getRepresentativeMediaAssetId());

        User group = null;
        if (request.getGroupId() != null) {
            group = userRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new PostException(PostErrorCode.GROUP_NOT_FOUND));
        }

        // 그룹 계정(ROLE_GROUP): 항상 공지. 그룹 소속 멤버(ARTIST): 항상 일반글. 그 외: 요청값 사용
        boolean isNotice;
        if (user.getRole() == UserRole.GROUP) {
            isNotice = true;
        } else if (user.getRole() == UserRole.ARTIST && request.getGroupId() != null) {
            isNotice = false;
        } else {
            isNotice = Boolean.TRUE.equals(request.getIsNotice());
        }
        ArtistPost artistPost = ArtistPost.builder()
                .user(user)
                .group(group)
                .title(request.getTitle())
                .content(request.getContent())
                .isMembershipOnly(request.getIsMembershipOnly())
                .isNotice(isNotice)
                .status(false)
                .representativeMediaAssetId(request.getRepresentativeMediaAssetId())
                .build();

        ArtistPost savedPost = artistPostRepository.save(artistPost);

        List<MediaAsset> mediaAssets = validateAndFetchMediaAssets(userId, request.getMediaAssetIds());
        for (MediaAsset asset : mediaAssets) {
            postMediaAssetRepository.save(new PostMediaAsset(PostMediaAssetType.ARTIST, savedPost.getId(), asset));
        }

        // 서비스 공지(ADMIN + group null) 등록 시 전체 유저에게 알림 발송 (실패해도 공지 등록은 성공)
        if (user.getRole() == UserRole.ADMIN && group == null && isNotice) {
            try {
                notifyServiceNotice(userId, savedPost);
            } catch (Exception e) {
                log.warn("공지 알림 발송 실패 (공지 등록은 완료됨): {}", e.getMessage(), e);
            }
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

    /** 그룹 계정이 올린 공지사항만 조회 (해당 그룹 페이지용) */
    public List<ArtistPostResponse> getNoticesByGroupId(Long groupId, Long lastPostId, int limit, Long userId, UserRole role) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findNoticesByGroupId(groupId, lastPostId, pageable).stream()
                .map(post -> buildPostResponseWithAccess(post,
                        postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, post.getId()),
                        userId, role, true))
                .collect(Collectors.toList());
    }

    /** 개인 아티스트가 공지로 지정한 글만 조회 */
    public List<ArtistPostResponse> getNoticesByArtistId(Long artistId, Long lastPostId, int limit, Long userId, UserRole role) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findNoticesByArtistId(artistId, lastPostId, pageable).stream()
                .map(post -> buildPostResponseWithAccess(post,
                        postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, post.getId()),
                        userId, role, true))
                .collect(Collectors.toList());
    }

    /** 페이지(그룹 또는 개인 아티스트)별 공지 목록: 그룹이면 그룹 공지, 개인 아티스트면 isNotice=true 글 */
    public List<ArtistPostResponse> getNoticesForPage(Long pageId, Long lastPostId, int limit, Long userId, UserRole role) {
        User pageUser = userRepository.findById(pageId).orElse(null);
        if (pageUser == null) {
            return List.of();
        }
        if (pageUser.getRole() == UserRole.GROUP) {
            return getNoticesByGroupId(pageId, lastPostId, limit, userId, role);
        }
        return getNoticesByArtistId(pageId, lastPostId, limit, userId, role);
    }

    public List<ArtistPostResponse> getArtistPosts(Long groupId, Long lastPostId, int limit, Long userId, UserRole role) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findArtistPosts(groupId, lastPostId, pageable).stream()
                .map(post -> buildPostResponseWithAccess(post,
                        postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, post.getId()),
                        userId, role, true))
                .collect(Collectors.toList());
    }

    public List<ArtistPostResponse> getMyArtistPosts(Long writerId, Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findMyArtistPosts(writerId, lastPostId, pageable).stream()
                .map(post -> ArtistPostResponse.from(post,
                        buildAttachmentResponses(
                                postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, post.getId()))))
                .collect(Collectors.toList());
    }

    /** 본인이 작성한 게시글 목록 (관리용, 삭제되지 않은 것만) */
    public List<ArtistPostResponse> getMyPosts(User user, Pageable pageable) {
        return artistPostRepository.findByUserAndStatusOrderByCreatedAtDesc(user, false, pageable)
                .getContent()
                .stream()
                .map(post -> ArtistPostResponse.from(post,
                        buildAttachmentResponses(postMediaAssetRepository.findAllByPostTypeAndPostIdOrderById(PostMediaAssetType.ARTIST, post.getId()))))
                .collect(Collectors.toList());
    }

    @Transactional
    public ArtistPostResponse updatePost(Long userId, Long postId, ArtistPostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new PostException(PostErrorCode.USER_NOT_FOUND));

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

        // 그룹 계정: 항상 공지. 그룹 소속 멤버: 항상 일반글. 그 외: 요청값 사용
        Boolean isNotice;
        if (artistPost.getUser().getRole() == UserRole.GROUP) {
            isNotice = true;
        } else if (artistPost.getUser().getRole() == UserRole.ARTIST && artistPost.getGroup() != null) {
            isNotice = false;
        } else {
            isNotice = request.getIsNotice();
        }
        artistPost.update(request.getTitle(), request.getContent(), request.getIsMembershipOnly(),
                isNotice, newRepresentativeId);

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
        commentService.deleteAllByTarget(TargetType.ARTIST, postId);
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
                .isNotice(ArtistPostResponse.isNotice(post))
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
        // GROUP 계정: 자신의 그룹 포스트에 항상 접근 가능
        if (role == UserRole.GROUP) {
            return post.getGroup() != null && post.getGroup().getId().equals(userId);
        }
        if (role == UserRole.ARTIST) {
            // 작성자 본인
            if (post.getUser().getId().equals(userId)) return true;
            // 해당 포스트의 그룹에 소속된 멤버
            if (post.getGroup() != null) {
                return groupMemberRepository.existsByGroupIdAndMemberId(post.getGroup().getId(), userId);
            }
            return false;
        }
        // USER: 멤버십 상품 일회 구매(12개월 내) 시에만 접근 가능
        Long artistId = post.getGroup() != null ? post.getGroup().getId() : post.getUser().getId();
        return orderRepository.existsPaidMembershipOrder(
                userId,
                artistId,
                OrderStatus.COMPLETED,
                Instant.now().atZone(ZoneId.systemDefault()).minusMonths(12).toInstant());
    }

    /** 서비스 공지 등록 시 전체 유저에게 알림 발송 (작성자 제외) */
    private void notifyServiceNotice(Long adminUserId, ArtistPost post) {
        List<Long> userIds = userRepository.findAllUserIdsByDeletedAtIsNull();
        if (userIds == null || userIds.isEmpty()) return;
        String contentPreview = post.getContent();
        if (contentPreview != null && contentPreview.length() > 50) {
            contentPreview = contentPreview.substring(0, 50) + "…";
        }
        String content = "새로운 공지가 등록되었습니다." + (contentPreview != null && !contentPreview.isBlank() ? " " + contentPreview : "");

        for (Long receiverId : userIds) {
            if (receiverId.equals(adminUserId)) continue; // 작성자 본인 제외
            try {
                notificationService.sendNotification(NotificationSendRequest.builder()
                        .senderId(adminUserId)
                        .receiverId(receiverId)
                        .type(NotificationType.SERVICE_NOTICE)
                        .content(content)
                        .build());
            } catch (Exception e) {
                // 개별 알림 실패 시 로그만 하고 계속 진행
            }
        }
    }
}
