package org.example.backend.global.security.oauth2.user;

import java.util.Map;

public class KakaoUserInfo implements OAuth2UserInfo {

    private final Map<String, Object> attributes;
    private final Map<String, Object> attributesAccount;
    private final Map<String, Object> attributesProfile;

    public KakaoUserInfo(Map<String, Object> attributes) {
        /*
            카카오 데이터 구조:
            {
                "id": 12345,
                "kakao_account": {
                    "email": "xxx@xxx",
                    "profile": { "nickname": "홍길동", "profile_image_url": "..." }
                }
            }
         */
        this.attributes = attributes;
        this.attributesAccount = (Map<String, Object>) attributes.get("kakao_account");
        this.attributesProfile = (Map<String, Object>) attributesAccount.get("profile");
    }

    @Override
    public String getProviderId() {
        return String.valueOf(attributes.get("id")); // 카카오 ID는 숫자로 옴
    }

    @Override
    public String getProvider() {
        return "kakao";
    }

    @Override
    public String getEmail() {
        return (String) attributesAccount.get("email");
    }

    @Override
    public String getName() {
        return (String) attributesProfile.get("nickname");
    }

    @Override
    public String getProfileImageUrl() {
        return (String) attributesProfile.get("profile_image_url");
    }
}
