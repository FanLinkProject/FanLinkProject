package org.example.backend.global.security.oauth2;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.entity.User;
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
        
        // 2. 제공자 정보 추출 (kakao, google 등)
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        log.info("OAuth2 로그인 시도 - Provider: {}", registrationId);

        // 3. 제공자별 사용자 정보 처리 및 User 엔티티 반환
        User user = processOAuth2User(registrationId, oAuth2User.getAttributes());
        
        // 4. PrincipalDetails로 변환하여 Spring Security에서 사용할 수 있도록 함
        return new PrincipalDetails(user);
    }

    // OAuth2 신규 사용자 생성
    private User processOAuth2User(String provider, Map<String, Object> attributes) {
        String providerId;
        String email;
        String nickname;
        String name;
        String profileImageUrl;
        String gender;
        String birthday;
        String birthYear;
        String phoneNumber;

        // 제공자별 사용자 정보 추출
        if ("kakao".equals(provider)) {
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
            
            providerId = String.valueOf(attributes.get("id"));
            email = kakaoAccount.get("email") != null ? (String) kakaoAccount.get("email") : null;
            nickname = profile.get("nickname") != null ? (String) profile.get("nickname") : null;
            name = kakaoAccount.get("name") != null ? (String) kakaoAccount.get("name") : null;
            gender = kakaoAccount.get("gender") != null ? (String) kakaoAccount.get("gender") : null;
            birthday = kakaoAccount.get("birthday") != null ? (String) kakaoAccount.get("birthday") : null;
            birthYear = kakaoAccount.get("birthyear") != null ? (String) kakaoAccount.get("birthyear") : null;
            phoneNumber = kakaoAccount.get("phone_number") != null ? (String) kakaoAccount.get("phone_number") : null;

            // 프로필 사진은 scope(profile_image) 동의 시 내려옴
            profileImageUrl = profile.get("profile_image_url") != null
                    ? (String) profile.get("profile_image_url")
                    : (profile.get("thumbnail_image_url") != null ? (String) profile.get("thumbnail_image_url") : null);

            if (name == null || name.isBlank()) {
                name = nickname != null ? nickname : "카카오사용자";
            }

        } else {
            throw new OAuth2AuthenticationException("지원하지 않는 OAuth2 제공자입니다: " + provider);
        }

        // 기존 사용자 조회 (provider와 providerId로 조회)
        User user = userRepository.findByProviderAndProviderId(provider, providerId)
                .orElse(null);

        if (user == null) {
            // 신규 사용자 생성
            String mergedBirth = buildBirth(birthYear, birthday);
            user = createOAuth2User(
                    email,
                    name,
                    nickname,
                    profileImageUrl,
                    provider,
                    providerId,
                    gender,
                    mergedBirth,
                    phoneNumber
            );
        } else {
            // 기존 사용자 정보 업데이트 (프로필 이미지 등 변경된 정보)
            boolean updated = false;
            if (profileImageUrl != null && !profileImageUrl.equals(user.getProfileImageUrl())) {
                user.setProfileImageUrl(profileImageUrl);
                updated = true;
            }

            if (name != null && !name.equals(user.getName())) {
                user.setName(name);
                updated = true;
            }

            // birthyear + birthday -> birth(YYYY-MM-DD)로 저장
            String mergedBirth = buildBirth(birthYear, birthday);
            if (mergedBirth != null && !mergedBirth.equals(user.getBirth())) {
                user.setBirth(mergedBirth);
                updated = true;
            }

            if (phoneNumber != null && !phoneNumber.equals(user.getPhoneNumber())) {
                // phone_number는 UNIQUE라 충돌 가능성 있어서 값이 있는 경우에만 반영.
                user.setPhoneNumber(phoneNumber);
                updated = true;
            }
            
            if (updated) {
                userRepository.save(user);
            }
        }

        return user;
    }


    // 카카오에서 받은 birthYear, birthDay 합쳐서 birth로 저장
    private String buildBirth(String birthYear, String birthday) {
        if (birthYear == null || birthYear.isBlank()) return null;
        if (birthday == null || birthday.length() != 4) return null;
        String mm = birthday.substring(0, 2);
        String dd = birthday.substring(2, 4);
        return birthYear + "-" + mm + "-" + dd;
    }

    private User createOAuth2User(
            String email,
            String name,
            String nickname,
            String profileImageUrl,
            String provider,
            String providerId,
            String gender,
            String birth,
            String phoneNumber
    ) {
        // 고유한 닉네임 생성 (중복 시 숫자 추가)
        String baseNickname = nickname != null ? nickname : 
                             (name != null ? name : email.split("@")[0]);
        String uniqueNickname = generateUniqueNickname(baseNickname);

        // OAuth2용 정적 팩토리 메서드로 User 엔티티 생성
        User user = User.ofOAuth2(
            email,
            uniqueNickname,
            name,
            profileImageUrl,
            provider,
            providerId,
            gender,
            phoneNumber
        );

        // birth는 NOT NULL이므로, 넘어온 값이 있으면 설정하고 없으면 기본값 유지
        if (birth != null && !birth.isBlank()) {
            user.setBirth(birth);
        }

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
