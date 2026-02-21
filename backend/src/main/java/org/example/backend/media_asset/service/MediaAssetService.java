package org.example.backend.media_asset.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.media_asset.config.AwsProperties;
import org.example.backend.media_asset.config.MediaProperties;
import org.example.backend.media_asset.dto.request.CompleteRequest;
import org.example.backend.media_asset.dto.request.PresignItemRequest;
import org.example.backend.media_asset.dto.request.PresignRequest;
import org.example.backend.media_asset.dto.response.CompleteItemResponse;
import org.example.backend.media_asset.dto.response.CompleteResponse;
import org.example.backend.media_asset.dto.response.PresignItemResponse;
import org.example.backend.media_asset.dto.response.PresignResponse;
import org.example.backend.media_asset.entity.MediaAsset;
import org.example.backend.media_asset.entity.MediaAssetCategory;
import org.example.backend.media_asset.entity.MediaAssetRejectedReason;
import org.example.backend.media_asset.entity.MediaAssetStatus;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.example.backend.media_asset.metadata.VideoMetadataExtractor;
import org.example.backend.media_asset.repository.MediaAssetRepository;
import org.example.backend.replay.entity.Replay;
import org.example.backend.replay.repository.ReplayRepository;
import org.example.backend.replay.service.MediaConvertJobService;
import org.example.backend.replay.entity.ReplayStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.example.backend.user.enums.UserRole;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MediaAssetService {

    private final MediaAssetRepository mediaAssetRepository;
    private final ObjectKeyGenerator objectKeyGenerator;
    private final MediaPolicyValidator mediaPolicyValidator;
    private final MediaOwnershipValidator mediaOwnershipValidator;
    private final S3MediaClient s3MediaClient;
    private final MediaProperties mediaProperties;
    private final AwsProperties awsProperties;
    private final Clock mediaClock;
    private final VideoMetadataExtractor videoMetadataExtractor;
    private final ReplayRepository replayRepository;
    private final MediaConvertJobService mediaConvertJobService;

    // 업로드용 presigned URL을 배치 발급하고 INITIATED 상태를 저장한다.
    @Transactional
    public PresignResponse presign(PresignRequest request, PrincipalDetails principalDetails) {
        Long userId = principalDetails.getUserId();
        UserRole userRole = principalDetails.getUser().getRole();
        List<PresignItemResponse> responses = new ArrayList<>();
        for (PresignItemRequest item : request.items()) {
            mediaOwnershipValidator.validatePresignOwnership(item, userId, userRole);
            mediaPolicyValidator.validatePresign(item, userRole);
            String objectKey = objectKeyGenerator.generate(item, userId);
            if (mediaAssetRepository.findByObjectKey(objectKey).isPresent()) {
                throw new MediaAssetException(MediaAssetErrorCode.DUPLICATE_MEDIA_ASSET);
            }
            Instant now = Instant.now(mediaClock);
            Instant orphanExpiresAt = now.plus(Duration.ofMinutes(mediaProperties.getOrphan().getExpiresMinutes()));
            Instant presignExpiresAt = now.plusSeconds(mediaProperties.getPresign().getExpireSeconds());

            S3MediaClient.PresignedUpload presignedUpload = s3MediaClient.presignPut(
                    objectKey,
                    item.contentType(),
                    Duration.ofSeconds(mediaProperties.getPresign().getExpireSeconds())
            );

            MediaAsset mediaAsset = new MediaAsset(
                    userId,
                    item.category(),
                    item.scope(),
                    objectKey,
                    item.contentType(),
                    item.sizeBytes(),
                    item.durationSecondsRequested(),
                    orphanExpiresAt
            );

            mediaAssetRepository.save(mediaAsset);

            responses.add(new PresignItemResponse(
                    objectKey,
                    presignedUpload.uploadUrl(),
                    presignExpiresAt,
                    presignedUpload.requiredHeaders()
            ));
        }
        return new PresignResponse(responses);
    }

    // 업로드 완료 배치를 처리해 S3 HEAD 검증 후 상태를 확정한다.
    @Transactional
    public CompleteResponse complete(CompleteRequest request, PrincipalDetails principalDetails) {
        Long userId = principalDetails.getUserId();
        List<CompleteItemResponse> responses = new ArrayList<>();
        for (var item : request.items()) {
            String objectKey = item.objectKey();
            if (!objectKeyGenerator.isObjectKeySafe(objectKey)) {
                responses.add(new CompleteItemResponse(
                        null,
                        objectKey,
                        MediaAssetStatus.REJECTED,
                        null,
                        MediaAssetRejectedReason.INVALID_OBJECT_KEY,
                        null,
                        null,
                        MediaAssetErrorCode.INVALID_OBJECT_KEY.getCode()
                ));
                continue;
            }

            Optional<MediaAsset> optionalMediaAsset = mediaAssetRepository.findByObjectKey(objectKey);
            if (optionalMediaAsset.isEmpty()) {
                responses.add(new CompleteItemResponse(
                        null,
                        objectKey,
                        MediaAssetStatus.REJECTED,
                        null,
                        MediaAssetRejectedReason.NOT_FOUND,
                        null,
                        null,
                        MediaAssetErrorCode.MEDIA_ASSET_NOT_FOUND.getCode()
                ));
                continue;
            }

            MediaAsset mediaAsset = optionalMediaAsset.get();
            if (!mediaAsset.getOwnerUserId().equals(userId)) {
                responses.add(new CompleteItemResponse(
                        mediaAsset.getId(),
                        mediaAsset.getObjectKey(),
                        MediaAssetStatus.REJECTED,
                        null,
                        null,
                        null,
                        null,
                        MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED.getCode()
                ));
                continue;
            }
            Instant now = Instant.now(mediaClock);
            if (mediaAsset.getStatus() == MediaAssetStatus.INITIATED
                    && mediaAsset.getExpiresAt() != null
                    && mediaAsset.getExpiresAt().isBefore(now)) {
                mediaAsset.markOrphan(now);
                mediaAssetRepository.save(mediaAsset);
                s3MediaClient.deleteObjectQuietly(objectKey);
                responses.add(new CompleteItemResponse(
                        mediaAsset.getId(),
                        mediaAsset.getObjectKey(),
                        mediaAsset.getStatus(),
                        null,
                        null,
                        mediaAsset.getContentTypeActual(),
                        mediaAsset.getSizeBytesActual(),
                        MediaAssetErrorCode.PRESIGNED_URL_EXPIRED.getCode()
                ));
                continue;
            }
            if (mediaAsset.getStatus() == MediaAssetStatus.READY) {
                responses.add(toCompleteResponse(mediaAsset));
                continue;
            }
            if (mediaAsset.getStatus() == MediaAssetStatus.REJECTED
                    || mediaAsset.getStatus() == MediaAssetStatus.ORPHAN
                    || mediaAsset.getStatus() == MediaAssetStatus.DELETED) {
                responses.add(toCompleteResponse(mediaAsset));
                continue;
            }

            S3MediaClient.HeadObjectInfo headInfo = s3MediaClient.headObject(objectKey);
            if (headInfo == null) {
                mediaAsset.markRejected(MediaAssetRejectedReason.HEAD_NOT_FOUND, null, null);
                mediaAssetRepository.save(mediaAsset);
                s3MediaClient.deleteObjectQuietly(objectKey);
                responses.add(toCompleteResponse(mediaAsset));
                continue;
            }

            String actualContentType = normalizeContentType(headInfo.contentType());
            long actualSizeBytes = headInfo.contentLength();

            MediaAssetRejectedReason rejection = validateHead(mediaAsset, actualContentType, actualSizeBytes);
            if (rejection != null) {
                mediaAsset.markRejected(rejection, actualContentType, actualSizeBytes);
                mediaAssetRepository.save(mediaAsset);
                s3MediaClient.deleteObjectQuietly(objectKey);
                responses.add(toCompleteResponse(mediaAsset));
                continue;
            }

            if (!isActualDurationAllowed(mediaAsset)) {
                mediaAsset.markRejected(MediaAssetRejectedReason.POLICY_VIOLATION, actualContentType, actualSizeBytes);
                mediaAssetRepository.save(mediaAsset);
                s3MediaClient.deleteObjectQuietly(objectKey);
                responses.add(toCompleteResponse(mediaAsset));
                continue;
            }

            mediaAsset.markReady(actualContentType, actualSizeBytes);
            mediaAssetRepository.save(mediaAsset);
            applyReplayMapping(mediaAsset);
            responses.add(toCompleteResponse(mediaAsset));
        }
        return new CompleteResponse(responses);
    }

    /**
     * 프로필 이미지용 MediaAsset의 공개 CDN URL을 반환한다.
     * 소유자 일치 및 카테고리 PROFILE_IMAGE 검증 후 URL을 생성한다.
     */
    @Transactional(readOnly = true)
    public String getPublicUrlForProfileImage(Long mediaAssetId, Long userId) {
        MediaAsset mediaAsset = mediaAssetRepository.findById(mediaAssetId)
                .orElseThrow(() -> new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_NOT_FOUND));
        if (!mediaAsset.getOwnerUserId().equals(userId)) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED);
        }
        if (mediaAsset.getCategory() != MediaAssetCategory.PROFILE_IMAGE) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_ACCESS_DENIED, "프로필 이미지가 아닌 미디어입니다.");
        }
        if (mediaAsset.getStatus() != MediaAssetStatus.READY) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_MEDIA_ASSET_STATUS, "업로드가 완료된 프로필 이미지만 사용할 수 있습니다.");
        }
        return buildCdnUrl(mediaAsset.getObjectKey());
    }

    // presign 요청의 owner/userRole이 로그인 사용자와 일치하는지 확인한다.
    // HEAD 결과가 정책/요청값과 일치하는지 검사하고 거부 사유를 리턴한다.
    private MediaAssetRejectedReason validateHead(MediaAsset mediaAsset, String actualContentType, long actualSizeBytes) {
        if (!mediaPolicyValidator.isContentTypeAllowed(mediaAsset.getCategory(), actualContentType)) {
            return MediaAssetRejectedReason.CONTENT_TYPE_MISMATCH;
        }
        if (!normalizeContentType(mediaAsset.getContentTypeRequested()).equals(actualContentType)) {
            return MediaAssetRejectedReason.CONTENT_TYPE_MISMATCH;
        }
        if (!mediaPolicyValidator.isSizeAllowed(mediaAsset.getCategory(), actualSizeBytes)) {
            return MediaAssetRejectedReason.SIZE_EXCEEDED;
        }
        if (mediaAsset.getSizeBytesRequested() != null && actualSizeBytes > mediaAsset.getSizeBytesRequested()) {
            return MediaAssetRejectedReason.SIZE_EXCEEDED;
        }
        return null;
    }

    // (Sp-2 확장 포인트) 실제 영상 길이 검증이 필요한 경우 체크한다.
    private boolean isActualDurationAllowed(MediaAsset mediaAsset) {
        if (mediaAsset.getCategory() != MediaAssetCategory.POST_VIDEO
                && mediaAsset.getCategory() != MediaAssetCategory.REPLAY_VIDEO) {
            return true;
        }
        Optional<Long> actualDuration = videoMetadataExtractor.extractDurationSeconds(mediaAsset.getObjectKey());
        if (actualDuration.isEmpty()) {
            return true;
        }
        long actualSeconds = actualDuration.get();
        long maxAllowed = mediaPolicyValidator.resolveMaxDuration(mediaAsset.getCategory());
        if (actualSeconds > maxAllowed) {
            return false;
        }
        Long requested = mediaAsset.getDurationSecondsRequested();
        return requested == null || actualSeconds <= requested;
    }


    // 엔티티 상태에 맞는 complete 응답 DTO를 구성한다.
    private CompleteItemResponse toCompleteResponse(MediaAsset mediaAsset) {
        String url = null;
        if (mediaAsset.getStatus() == MediaAssetStatus.READY) {
            url = buildCdnUrl(mediaAsset.getObjectKey());
        }
        return new CompleteItemResponse(
                mediaAsset.getId(),
                mediaAsset.getObjectKey(),
                mediaAsset.getStatus(),
                url,
                mediaAsset.getStatus() == MediaAssetStatus.REJECTED ? mediaAsset.getRejectedReason() : null,
                mediaAsset.getContentTypeActual(),
                mediaAsset.getSizeBytesActual(),
                null
        );
    }

    // Replay 업로드 결과를 Replay 엔티티에 반영한다.
    private void applyReplayMapping(MediaAsset mediaAsset) {
        if (mediaAsset.getStatus() != MediaAssetStatus.READY) {
            return;
        }
        if (mediaAsset.getCategory() != MediaAssetCategory.REPLAY_VIDEO
                && mediaAsset.getCategory() != MediaAssetCategory.REPLAY_THUMBNAIL) {
            return;
        }
        String replayIdOrTemp = extractReplayIdOrTemp(mediaAsset.getObjectKey());
        if (replayIdOrTemp == null || replayIdOrTemp.startsWith("tmp_")) {
            return;
        }
        Long replayId = parseLongSafely(replayIdOrTemp);
        if (replayId == null) {
            return;
        }
        Replay replay = replayRepository.findById(replayId).orElse(null);
        if (replay == null) {
            return;
        }
        if (mediaAsset.getCategory() == MediaAssetCategory.REPLAY_VIDEO) {
            replay.updateMp4Key(mediaAsset.getObjectKey());
            submitMediaConvertIfNeeded(replay, mediaAsset.getObjectKey());
        } else {
            replay.updateThumbnailKey(mediaAsset.getObjectKey());
        }
    }

    private void submitMediaConvertIfNeeded(Replay replay, String objectKey) {
        if (replay.getMediaConvertJobId() != null && !replay.getMediaConvertJobId().isBlank()) {
            return;
        }
        if (!isRawReplayObjectKey(objectKey)) {
            return;
        }
        String jobId = mediaConvertJobService.submitReplayJob(replay, objectKey);
        if (jobId == null || jobId.isBlank()) {
            return;
        }
        replay.updateMediaConvertJobId(jobId);
        replay.changeStatus(ReplayStatus.VALIDATING);
        replayRepository.save(replay);
    }

    private boolean isRawReplayObjectKey(String objectKey) {
        if (objectKey == null) {
            return false;
        }
        String normalized = objectKey.startsWith("restricted/")
                ? objectKey.substring("restricted/".length())
                : objectKey;
        return normalized.startsWith("raw/replays/");
    }

    // objectKey에서 replayIdOrTemp를 추출한다.
    private String extractReplayIdOrTemp(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }
        String normalized = objectKey.startsWith("restricted/")
                ? objectKey.substring("restricted/".length())
                : objectKey;
        String[] prefixes = {
                "raw/replays/",
                "public/replays/",
                "live/replays/"
        };
        for (String prefix : prefixes) {
            if (!normalized.startsWith(prefix)) {
                continue;
            }
            String remainder = normalized.substring(prefix.length());
            int idx = remainder.indexOf('/');
            if (idx <= 0) {
                return null;
            }
            return remainder.substring(0, idx);
        }
        return null;
    }

    // 문자열을 Long으로 안전하게 변환한다.
    private Long parseLongSafely(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // CloudFront 도메인과 objectKey로 CDN URL을 생성한다.
    private String buildCdnUrl(String objectKey) {
        String domain = awsProperties.getCloudfront().getDomain();
        if (domain == null || domain.isBlank()) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_MEDIA_ASSET_STATUS, "CloudFront 도메인이 필요합니다.");
        }
        return "https://" + domain + "/" + objectKey;
    }

    // Content-Type 비교를 위해 소문자/공백 제거 정규화를 수행한다.
    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }
        return contentType.trim().toLowerCase(Locale.ROOT);
    }
}
