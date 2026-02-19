package org.example.backend.replay.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.subscription.repository.SubscriptionRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component("replayDefaultSubscriptionGateway")
@RequiredArgsConstructor
public class DefaultSubscriptionGateway implements SubscriptionGateway {

    private final SubscriptionRepository subscriptionRepository;

    // 구독 여부를 실제 Subscription 테이블 기준으로 판단한다.
    @Override
    public boolean isSubscribed(Long userId, Long artistId) {
        return subscriptionRepository.existsActiveSubscriptionForArtist(userId, artistId, Instant.now());
    }
}
