package org.example.backend.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    // 유저는 닉네임, 아티스트는 예명 사용
    @Column(name = "nickname", unique = true, nullable = false)
    private String nickname;

    // 결제 정보 등록 위한 실명
    @Column(name="name", nullable = false)
    private String name;

    @Column(name = "password", nullable = true)
    private String password; // TODO : 암호화

    @Column(name = "gender", nullable = false)
    private String gender;

    @Column(name = "birth", nullable = false)
    private String birth;

    // 개인정보 처리 동의 여부
    @Column(name = "privacy_policy_agreed", nullable = false, columnDefinition = "TINYINT(1)")
    private Boolean privacyPolicyAgreed;

    @Column(name = "phone_number", unique = true, nullable = false)
    private String phoneNumber; // TODO : 암호화

    @Column(name = "candy")
    private Integer candy;

    @Column(name = "profile_image_url")
    private String profileImageUrl; // TODO : URL주소 추가 필요

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(name = "provider",  nullable = false)
    private String provider;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    // 유저 활동 상태
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    // TODO : 글로벌로 생성/수정 설정 오후 스크럼때 확인필요
    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // 정적 팩토리 메서드
    public static User of(
            String email,
            String nickname,
            String encodedPassword,
            UserRole role
    ) {
        User user = new User();
        user.setEmail(email);
        user.setNickname(nickname);
        user.setPassword(encodedPassword);
        user.setRole(role);
        user.setProvider("local");
        user.setProviderId(email);
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(LocalDateTime.now());
        user.setCandy(0);
        return user;
    }

    // 회원 탈퇴 (soft delete)
    public void delete() {
        this.deletedAt = LocalDateTime.now();
        this.status = UserStatus.BANNED; // 탈퇴 시 상태를 BANNED로 변경
    }

    /**
     * OAuth2 사용자 생성을 위한 정적 팩토리 메서드
     */
    public static User ofOAuth2(
            String email,
            String nickname,
            String name,
            String profileImageUrl,
            String provider,
            String providerId,
            String gender,
            String phoneNumber
    ) {
        User user = new User();
        user.setEmail(email);
        user.setNickname(nickname);
        user.setName(name != null ? name : nickname);
        user.setPassword(""); // OAuth2 사용자는 비밀번호 없음
        user.setGender(gender != null ? gender : "UNKNOWN");
        // birth는 NOT NULL이라 기본값 보장
        // 실제 birth(YYYY-MM-DD)는 OAuth2 서비스에서 birthyear+birthday를 합쳐 setBirth로 갱신합니다.
        user.setBirth("1900-01-01");
        user.setPrivacyPolicyAgreed(true); // OAuth2 로그인 시 동의한 것으로 간주
        // phone_number는 NOT NULL + UNIQUE라 기본값 보장 (없으면 providerId 기반으로 유니크하게 생성)
        user.setPhoneNumber(phoneNumber != null && !phoneNumber.isBlank() ? phoneNumber : ("kakao_" + providerId));
        user.setProfileImageUrl(profileImageUrl);
        user.setRole(UserRole.USER); // 기본 역할은 USER
        user.setProvider(provider);
        user.setProviderId(providerId);
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(LocalDateTime.now());
        user.setCandy(0);
        return user;
    }

    public void updateOAuth2Info(String provider, String providerId) {
    }
}
