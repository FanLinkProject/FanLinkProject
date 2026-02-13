package org.example.backend.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.post.entity.ArtistPost;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Getter
@Builder
public class ArtistPostResponse {
    private Long id;
    private Long writerId;
    private String writerNickname;
    private String title;
    private String content;
    private Boolean isMembershipOnly;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PostMediaAssetResponse> attachments;

    public static ArtistPostResponse from(ArtistPost post) {
        return ArtistPostResponse.builder()
                .id(post.getId())
                .writerId(post.getUser().getId())
                .writerNickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .isMembershipOnly(post.getIsMembershipOnly())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .attachments(Collections.emptyList())
                .build();
    }

    public static ArtistPostResponse from(ArtistPost post, List<PostMediaAssetResponse> attachments) {
        return ArtistPostResponse.builder()
                .id(post.getId())
                .writerId(post.getUser().getId())
                .writerNickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .isMembershipOnly(post.getIsMembershipOnly())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .attachments(attachments != null ? attachments : Collections.emptyList())
                .build();
    }
}
