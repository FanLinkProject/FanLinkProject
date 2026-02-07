package org.example.backend.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.post.entity.FanPost;

import java.time.LocalDateTime;

@Getter
@Builder
public class FanPostResponse {
    private Long id;
    private Long writerId;
    private String writerNickname;
    private String title;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static FanPostResponse from(FanPost post) {
        return FanPostResponse.builder()
                .id(post.getId())
                .writerId(post.getUser().getId())
                .writerNickname(post.getUser().getNickname())
                .title(post.getTitle())
                .content(post.getContent())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
