package org.example.backend.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.user.enums.UserRole;

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
    /** 서비스 관리자 공지(ADMIN + group null) 또는 그룹 계정 공지(ROLE_GROUP) 여부 */
    private Boolean isNotice;

    /** 서비스/그룹 공지 여부 판별 (다른 패키지에서 빌더로 응답할 때 사용) */
    public static boolean isNotice(ArtistPost post) {
        UserRole r = post.getUser().getRole();
        return (r == UserRole.ADMIN && post.getGroup() == null) || r == UserRole.GROUP;
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
