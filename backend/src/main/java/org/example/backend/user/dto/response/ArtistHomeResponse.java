package org.example.backend.user.dto.response;

import java.util.List;

// 아티스트 메인 홈 화면 dto
public record ArtistHomeResponse(
        List<PostStatistics> recentPosts
) {
    public record PostStatistics(
            Long postId,
            String title,
            String createdAt,
            Long commentCount    // 댓글 수 (현재는 0, 추후 구현)
    ) {
    }
}
