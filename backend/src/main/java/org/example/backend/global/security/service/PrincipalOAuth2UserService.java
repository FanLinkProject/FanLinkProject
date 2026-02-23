package org.example.backend.global.security.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.global.security.oauth2.user.GoogleUserInfo;
import org.example.backend.global.security.oauth2.user.InstagramUserInfo;
import org.example.backend.global.security.oauth2.user.KakaoUserInfo;
import org.example.backend.global.security.oauth2.user.NaverUserInfo;
import org.example.backend.global.security.oauth2.user.OAuth2UserInfo;
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
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oAuth2User.getAttributes();
        log.info("OAuth2 login attempt: registrationId={}", registrationId);

        OAuth2UserInfo oAuth2UserInfo = resolveUserInfo(registrationId, attributes);

        String provider = oAuth2UserInfo.getProvider();
        String providerId = oAuth2UserInfo.getProviderId();
        String name = oAuth2UserInfo.getName();
        String profileImage = oAuth2UserInfo.getProfileImageUrl();
        String email = oAuth2UserInfo.getEmail();

        if (email == null || email.isBlank()) {
            throw new UserException(UserErrorCode.OAUTH2_EMAIL_NOT_FOUND);
        }

        String finalEmail = email;
        String finalName = name;
        String finalProfileImage = profileImage;
        String finalProvider = provider;
        String finalProviderId = providerId;

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createOAuth2User(
                        finalEmail, finalName, finalProfileImage, finalProvider, finalProviderId
                ));

        return new PrincipalDetails(user, attributes);
    }

    private OAuth2UserInfo resolveUserInfo(String registrationId, Map<String, Object> attributes) {
        return switch (registrationId) {
            case "google" -> new GoogleUserInfo(attributes);
            case "kakao" -> new KakaoUserInfo(attributes);
            case "naver" -> new NaverUserInfo(attributes);
            case "instagram" -> new InstagramUserInfo(attributes);
            default -> throw new UserException(UserErrorCode.OAUTH2_PROVIDER_NOT_SUPPORTED);
        };
    }

    private User createOAuth2User(String email, String name, String picture, String provider, String providerId) {
        String nickname = generateUniqueNickname(name != null ? name : email.split("@")[0]);
        String randomPassword = UUID.randomUUID().toString();
        String encodedPassword = passwordEncoder.encode(randomPassword);

        User user = User.builder()
                .email(email)
                .nickname(nickname)
                .name(name != null ? name : "Unknown")
                .password(encodedPassword)
                .role(UserRole.USER)
                .phoneNumber(null)
                .birth(null)
                .gender(null)
                .privacyPolicyAgreed(true)
                .profileImageUrl(picture)
                .provider(provider)
                .providerId(providerId)
                .build();

        log.info("Created OAuth2 user: email={}, nickname={}", email, nickname);
        return userRepository.save(user);
    }

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
