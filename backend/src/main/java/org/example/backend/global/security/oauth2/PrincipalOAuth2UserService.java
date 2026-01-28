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

import static org.example.backend.user.enums.ReportType.user;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrincipalOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        return new PrincipalDetails(user, oAuth2User.getAttributes());
    }


    //OAuth2 신규 사용자 생성
    private User createOAuth2User(String email, String name, String picture, String provider, String providerId) {
        String nickname = generateUniqueNickname(name != null ? name : email.split("@")[0]);

        User user = User.builder()
                .email(email)
                .nickname(nickname)
                .password(null)
        //        .role(Role.USER)
                .phoneNumber("01000000000")
        //        .phoneNumberCollectionConsent(false)
                .profileImageUrl(picture)
                .provider(provider)
                .providerId(providerId)
                .build();

        log.info("OAuth2 신규 사용자 생성: {} ({})", email, nickname);
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
