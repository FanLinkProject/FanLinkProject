package org.example.backend.media_asset.gateway;

public interface FanMembershipGateway {

    // 팬 여부를 확인한다.
    boolean isFan(Long artistId, Long userId);
}
