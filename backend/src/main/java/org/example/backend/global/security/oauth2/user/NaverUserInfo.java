package org.example.backend.global.security.oauth2.user;

import java.util.Map;

public class NaverUserInfo implements OAuth2UserInfo {

    private final Map<String, Object> attributes; // 전체 데이터

    public NaverUserInfo(Map<String, Object> attributes) {
        /*
         [학습 포인트] 네이버 데이터 구조
         {
             "resultcode": "00",
             "message": "success",
             "response": {           <-- 실제 데이터는 여기 들어있음!
                 "id": "123123...",
                 "email": "user@naver.com",
                 "name": "홍길동",
                 "profile_image": "..."
             }
         }
         따라서 생성자에서 "response" 키로 한 번 꺼내줘야 합니다.
         */
        this.attributes = (Map<String, Object>) attributes.get("response");
    }

    @Override
    public String getProviderId() {
        return (String) attributes.get("id");
    }

    @Override
    public String getProvider() {
        return "naver";
    }

    @Override
    public String getEmail() {
        return (String) attributes.get("email");
    }

    @Override
    public String getName() {
        return (String) attributes.get("name");
    }

    @Override
    public String getProfileImageUrl() {
        return (String) attributes.get("profile_image");
    }
}