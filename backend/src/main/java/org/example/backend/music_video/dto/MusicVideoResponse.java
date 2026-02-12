package org.example.backend.music_video.dto;

import org.example.backend.music_video.entity.VideoProvider;

import java.time.LocalDateTime;

// 뮤직비디오 응답 DTO
public record MusicVideoResponse(
        Long id,
        Long artistId,
        VideoProvider provider,
        String videoId,
        String title,
        String description,
        String embedUrl,
        String thumbnailUrl,
        String commentTargetType,
        Long commentTargetId,
        LocalDateTime createdAt
) {
}
