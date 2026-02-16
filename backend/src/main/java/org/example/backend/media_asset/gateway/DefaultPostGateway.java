package org.example.backend.media_asset.gateway;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.post.entity.FanPost;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.post.repository.FanPostRepository;
import org.example.backend.user.entity.User;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DefaultPostGateway implements PostGateway {

    private final ArtistPostRepository artistPostRepository;
    private final FanPostRepository fanPostRepository;

    // 게시물이 속한 아티스트 ID를 조회한다.
    @Override
    public Long getArtistIdByPostId(Long postId) {
        if (postId == null || postId <= 0) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY, "postId가 필요합니다.");
        }
        ArtistPost artistPost = artistPostRepository.findById(postId).orElse(null);
        if (artistPost != null) {
            return resolveArtistId(artistPost.getGroup(), artistPost.getUser());
        }
        FanPost fanPost = fanPostRepository.findById(postId).orElse(null);
        if (fanPost != null) {
            return resolveArtistId(fanPost.getGroup(), fanPost.getUser());
        }
        throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_NOT_FOUND, "postId를 찾을 수 없습니다.");
    }

    // 그룹/작성자 정보를 기준으로 아티스트 ID를 계산한다.
    private Long resolveArtistId(User group, User author) {
        if (group != null) {
            return group.getId();
        }
        return author.getId();
    }
}
