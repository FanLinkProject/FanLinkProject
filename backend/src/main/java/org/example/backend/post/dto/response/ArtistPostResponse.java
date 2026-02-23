package org.example.backend.post.dto.response;

import org.example.backend.user.enums.UserRole;
import lombok.Builder;
import lombok.Getter;
import org.example.backend.post.entity.ArtistPost;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Getter
@Builder
public class ArtistPostResponse {
    private Long id;
    private Long writerId;
    private String writerNickname;
    private String writerProfileImageUrl;
    private String title;
    private String content;
    private Boolean isMembershipOnly;
    private Long representativeMediaAssetId;
    private Instant createdAt;
    private Instant updatedAt;
    private List<PostMediaAssetResponse> attachments;
    /** 공지 여부 (DB isNotice 필드 기준) */
    private Boolean isNotice;

    /** 공지 여부 판별 (DB 저장값 사용) */
    public static boolean isNotice(ArtistPost post) {
        return Boolean.TRUE.equals(post.getIsNotice());
    }

    private static boolean isNoticePost(ArtistPost post) {
        return isNotice(post);
    }

    public static ArtistPostResponse from(ArtistPost post) {
        return ArtistPostResponse.builder()
                .id(post.getId())
                .writerId(post.getUser().getId())
                .writerNickname(post.getUser().getNickname())
                .writerProfileImageUrl(post.getUser().getProfileImageUrl())
                .title(post.getTitle())
                .content(post.getContent())
                .isMembershipOnly(post.getIsMembershipOnly())
                .representativeMediaAssetId(post.getRepresentativeMediaAssetId())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .attachments(Collections.emptyList())
                .isNotice(isNoticePost(post))
                .build();
    }

    public static ArtistPostResponse from(ArtistPost post, List<PostMediaAssetResponse> attachments) {
        return ArtistPostResponse.builder()
                .id(post.getId())
                .writerId(post.getUser().getId())
                .writerNickname(post.getUser().getNickname())
                .writerProfileImageUrl(post.getUser().getProfileImageUrl())
                .title(post.getTitle())
                .content(post.getContent())
                .isMembershipOnly(post.getIsMembershipOnly())
                .representativeMediaAssetId(post.getRepresentativeMediaAssetId())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .attachments(attachments != null ? attachments : Collections.emptyList())
                .isNotice(isNoticePost(post))
                .build();
    }
}
