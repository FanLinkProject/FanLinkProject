package org.example.backend.global.security.oauth2.user;

public interface OAuth2UserInfo {
    String getProviderId(); // 소셜 식별자 (google의 sub, kakao의 id)
    String getProvider();   // google, kakao
    String getEmail();
    String getName();
    String getProfileImageUrl();
}
