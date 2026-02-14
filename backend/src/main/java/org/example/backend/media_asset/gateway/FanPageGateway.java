package org.example.backend.media_asset.gateway;

public interface FanPageGateway {

    // 팬페이지 소유자(userId)를 조회한다.
    Long getOwnerUserId(Long artistId);
}
