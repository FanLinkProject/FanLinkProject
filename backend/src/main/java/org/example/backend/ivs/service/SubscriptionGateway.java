package org.example.backend.ivs.service;

public interface SubscriptionGateway {

    // userId가 artistId를 구독 중인지 확인한다.
    boolean isSubscribed(Long userId, Long artistId);
}
