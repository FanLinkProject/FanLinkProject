package org.example.backend.global.security.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.global.security.oauth2.user.*;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrincipalOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 1. OAuth2 제공자로부터 사용자 정보 가져오기
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        // 2. 소셜로그인 식별
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        log.info("OAuth2 로그인 시도 - Provider: {}", attributes);

        // 3. 소셜 타입에 맞는 UserInfo 객체 생성(전략패턴)
        OAuth2UserInfo oAuth2UserInfo = null;
        if ("google".equals(registrationId)) {
            oAuth2UserInfo = new GoogleUserInfo(attributes);
        } else if ("kakao".equals(registrationId)) {
            // 팀원이 만든 KakaoUserInfo 사용
            oAuth2UserInfo = new KakaoUserInfo(attributes);
        } else if ("naver".equals(registrationId)) {
            // [신규] 네이버 추가
            oAuth2UserInfo = new NaverUserInfo(attributes);
        } else if ("instagram".equals(registrationId)) {
            // [신규] 인스타그램 추가
            oAuth2UserInfo = new InstagramUserInfo(attributes);
        } else {
            throw new OAuth2AuthenticationException("지원하지 않는 소셜 로그인입니다: " + registrationId);
        }


        
        // 4. 데이터 추출
        String provider = oAuth2UserInfo.getProvider();
        String providerId = oAuth2UserInfo.getProviderId();
        String name = oAuth2UserInfo.getName();
        String profileImage = oAuth2UserInfo.getProfileImageUrl();
        String email = oAuth2UserInfo.getEmail();

        // [예외 처리] 이메일이 없는 경우 (인스타그램 등)
        if (email == null) {
            // 임시 이메일 생성 로직: id + provider@social.com
            email = providerId + "@" + provider + ".com";
            log.warn("이메일 정보가 없어 임시 이메일을 생성합니다: {}", email);
        }

        log.info("OAuth2 Login Request: provider={}, email={}", provider, email);

        // 람다식용 변수 (Effectively Final)
        String finalEmail = email;
        String finalName = name;
        String finalProfileImage = profileImage;
        String finalProvider = provider;
        String finalProviderId = providerId;

        // 5. 회원가입 또는 로그인 처리
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createOAuth2User(finalEmail, finalName, finalProfileImage, finalProvider, finalProviderId));

        // 6. 세션에 저장될 유저 정보 반환
        return new PrincipalDetails(user, attributes);
    }


    // OAuth2 신규 사용자 생성
    private User createOAuth2User(String email, String name, String picture, String provider, String providerId) {
        String nickname = generateUniqueNickname(name != null ? name : email.split("@")[0]);

        User user = User.builder()
                .email(email)
                .nickname(nickname)
                .name(name != null ? name : "Unknown") // 이름이 없으면 Unknown
                .password(null) // 소셜은 비밀번호 없음
                .role(UserRole.USER)
                .phoneNumber(null)
                .birth(null)
                .gender(null)
                .privacyPolicyAgreed(true)
                .profileImageUrl(picture)
                .provider(provider)
                .providerId(providerId)
                .build();

        log.info("OAuth2 신규 사용자 생성: {} ({})", email, nickname);
        return userRepository.save(user);
    }

    // 닉네임(이름으로 자동 생성)이 중복이면 이름+n 으로 저장
    private String generateUniqueNickname(String baseNickname) {
        String nickname = baseNickname;
        int suffix = 1;

        while (userRepository.existsByNickname(nickname)) {
            nickname = baseNickname + suffix;
            suffix++;
        }
        
        return nickname;
    }
}
