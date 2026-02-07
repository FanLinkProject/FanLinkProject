package org.example.backend.post.dto.response;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.post.entity.ArtistPost;

import java.time.LocalDateTime;

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
                .build();
    }
}
