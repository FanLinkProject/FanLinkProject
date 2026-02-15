package org.example.backend.media_asset.gateway;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.example.backend.replay.repository.ReplayRepository;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DefaultReplayGateway implements ReplayGateway {

    private final ReplayRepository replayRepository;

    // 다시보기 소속 아티스트 ID를 조회한다.
    @Override
    public Long getArtistIdByReplayId(Long replayId) {
        if (replayId == null || replayId <= 0) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY, "replayId가 필요합니다.");
        }
        return replayRepository.findById(replayId)
                .map(replay -> replay.getArtistId())
                .orElseThrow(() -> new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_NOT_FOUND, "replayId를 찾을 수 없습니다."));
    }
}
