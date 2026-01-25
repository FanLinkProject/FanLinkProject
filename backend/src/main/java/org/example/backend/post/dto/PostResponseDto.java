package org.example.backend.post.dto;

import lombok.Builder;
import lombok.Getter;
import org.example.backend.post.entity.Post;

import java.time.LocalDateTime;

@Getter
@Builder
public class PostResponseDto {
    private Long id;
    private String title;
    private String content;
    private Long writerId;
    private String writerType; // "USER" or "ARTIST"
    private Long likeCount;
    private LocalDateTime createdAt;

    public static PostResponseDto from(Post post) {
        return PostResponseDto.builder()
                .id(post.getId())
                .title(post.getTitle())
                .content(post.getContent())
                .writerId(post.getWriterId())
                .writerType(post.getWriterType().name())
                .likeCount(post.getLikeCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}