package org.example.backend.music_video.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// 뮤직비디오 등록 요청 DTO
public record CreateMusicVideoRequest(
        @NotBlank
        String url,
        @NotBlank
        @Size(max = 150)
        String title,
        @NotBlank
        @Size(max = 2000)
        String description
) {
}
