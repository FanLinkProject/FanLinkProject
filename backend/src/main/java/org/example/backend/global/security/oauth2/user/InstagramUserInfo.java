package org.example.backend.global.security.oauth2.user;

import java.util.Map;

public class InstagramUserInfo implements OAuth2UserInfo {

    private final Map<String, Object> attributes;

    public InstagramUserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    @Override
    public String getProviderId() {
        return (String) attributes.get("id");
    }

    @Override
    public String getProvider() {
        return "instagram";
    }

    @Override
    public String getEmail() {
        // [학습 포인트] 인스타그램 Basic API는 이메일을 주지 않는 경우가 많음.
        // 이 경우 null을 반환하고, 서비스 로직에서 임의의 이메일을 생성하거나
        // 사용자에게 추가 입력을 받는 로직이 필요할 수 있음.
        return null;
    }

    @Override
    public String getName() {
        return (String) attributes.get("username");
    }

    @Override
    public String getProfileImageUrl() {
        // 인스타그램은 프로필 이미지 URL 필드명이 다를 수 있음 (상황에 따라 확인 필요)
        return null;
    }
}