package org.example.backend.media_asset.gateway;

public interface PostGateway {

    // 게시물이 속한 아티스트 ID를 조회한다.
    Long getArtistIdByPostId(Long postId);

    /**
     * 공지 게시물 여부. 공지=그룹 계정만 첨부 가능, 아티스트 게시물=그룹+소속멤버 가능.
     */
    boolean isNoticePost(Long postId);
}
