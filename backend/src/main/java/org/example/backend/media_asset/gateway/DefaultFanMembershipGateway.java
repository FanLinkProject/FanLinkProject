package org.example.backend.media_asset.gateway;

import lombok.RequiredArgsConstructor;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DefaultFanMembershipGateway implements FanMembershipGateway {

    private final SubscriptionRepository subscriptionRepository;

    // 팬 여부를 구독 테이블 기준으로 판단한다.
    @Override
    public boolean isFan(Long artistId, Long userId) {
        if (artistId == null || userId == null) {
            return false;
        }
        return subscriptionRepository.existsActiveSubscriptionForArtist(userId, artistId, LocalDateTime.now());
    }
}
