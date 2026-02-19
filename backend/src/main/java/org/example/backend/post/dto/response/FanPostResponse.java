package org.example.backend.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.post.entity.FanPost;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Getter
@Builder
public class FanPostResponse {
    private Long id;
    private Long writerId;
    private String writerNickname;
    private String title;
    private String content;
    private Instant createdAt;
    private Instant updatedAt;
    private List<PostMediaAssetResponse> attachments;

    public static FanPostResponse from(FanPost post) {
        return FanPostResponse.builder()
                .id(post.getId())
                .writerId(post.getUser().getId())
                .writerNickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .attachments(Collections.emptyList())
                .build();
    }

    public static FanPostResponse from(FanPost post, List<PostMediaAssetResponse> attachments) {
        return FanPostResponse.builder()
                .id(post.getId())
                .writerId(post.getUser().getId())
                .writerNickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .attachments(attachments != null ? attachments : Collections.emptyList())
                .build();
    }
}
