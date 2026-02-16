package org.example.backend.media_asset.gateway;

public interface PostGateway {

    // 게시물이 속한 아티스트 ID를 조회한다.
    Long getArtistIdByPostId(Long postId);
}
