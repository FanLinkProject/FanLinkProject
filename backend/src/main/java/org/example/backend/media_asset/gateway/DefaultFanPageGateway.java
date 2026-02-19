package org.example.backend.media_asset.gateway;

import lombok.RequiredArgsConstructor;
import org.example.backend.media_asset.exception.MediaAssetErrorCode;
import org.example.backend.media_asset.exception.MediaAssetException;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DefaultFanPageGateway implements FanPageGateway {

    private final UserRepository userRepository;

    // 팬페이지 소유자(userId)를 조회한다.
    @Override
    public Long getOwnerUserId(Long artistId) {
        if (artistId == null || artistId <= 0) {
            throw new MediaAssetException(MediaAssetErrorCode.INVALID_OBJECT_KEY, "artistId가 필요합니다.");
        }
        if (userRepository.findById(artistId).isEmpty()) {
            throw new MediaAssetException(MediaAssetErrorCode.MEDIA_ASSET_NOT_FOUND, "artistId를 찾을 수 없습니다.");
        }
        return artistId;
    }
}
