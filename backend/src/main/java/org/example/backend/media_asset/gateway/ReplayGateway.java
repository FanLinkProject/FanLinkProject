package org.example.backend.media_asset.gateway;

public interface ReplayGateway {

    // 다시보기 소속 아티스트 ID를 조회한다.
    Long getArtistIdByReplayId(Long replayId);
}
