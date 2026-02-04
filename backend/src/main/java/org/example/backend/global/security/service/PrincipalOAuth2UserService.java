package org.example.backend.global.security.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.global.security.oauth2.user.*;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.exception.UserException;
import org.example.backend.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrincipalOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder; // oauth2 관련 보안 - 임의비밀번호생성 암호화


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
            throw new UserException(UserErrorCode.OAUTH2_PROVIDER_NOT_SUPPORTED);
        }

        // 4. 데이터 추출
        String provider = oAuth2UserInfo.getProvider();
        String providerId = oAuth2UserInfo.getProviderId();
        String name = oAuth2UserInfo.getName();
        String profileImage = oAuth2UserInfo.getProfileImageUrl();
        String email = oAuth2UserInfo.getEmail();

        // 이메일정보 체크, 예외처리 수정
        if (email == null || email.isBlank()) {
            throw new UserException(UserErrorCode.OAUTH2_EMAIL_NOT_FOUND);
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

        // [보안] 소셜 로그인은 비밀번호가 없지만, DB 제약조건(Not Null)이나 보안을 위해 랜덤 비밀번호 생성
        String randomPassword = UUID.randomUUID().toString();
        String encodedPassword = passwordEncoder.encode(randomPassword);

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
