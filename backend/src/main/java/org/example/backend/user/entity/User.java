package org.example.backend.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.global.util.StringEncryptor;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.exception.UserErrorCode;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Getter
@Setter
@EntityListeners(AuditingEntityListener.class)
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
    private String password;

    @Column(name = "gender", nullable = true)
    private String gender;

    @Column(name = "birth", nullable = true)
    private String birth;

    // 개인정보 처리 동의 여부
    @Column(name = "privacy_policy_agreed", nullable = false, columnDefinition = "TINYINT(1)")
    private Boolean privacyPolicyAgreed;

    @Convert(converter = StringEncryptor.class)
    @Column(name = "phone_number", unique = true, nullable = true)
    private String phoneNumber;

    @Column(name = "candy")
    private Long candy;

    @Column(name = "profile_image_url")
    private String profileImageUrl; // TODO : URL주소 추가 필요

    // 아티스트 소개
    @Column(name = "bio", length = 1000)
    private String bio;

    // 아티스트 배너 이미지 URL
    @Column(name = "banner_image_url")
    private String bannerImageUrl;

    // 아티스트 공식 링크 (JSON 형식으로 여러 링크 저장 가능, 예: {"instagram": "url", "youtube": "url"})
    @Column(name = "official_links", columnDefinition = "TEXT")
    private String officialLinks;

    // 아티스트 채널 ARN (관리자 계정 생성 시 설정, 라이브 등 연동용)
    @Column(name = "channel_arn")
    private String channelArn;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20, columnDefinition = "varchar(20)")
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
            String name,
            String encodedPassword,
            String gender,
            String birth,
            String phoneNumber,
            Boolean privacyPolicyAgreed,
            UserRole role
    ) {
        User user = new User();
        user.setEmail(email);
        user.setNickname(nickname);
        user.setName(name);
        user.setPassword(encodedPassword);
        user.setGender(gender);
        user.setBirth(birth);
        user.setPhoneNumber(phoneNumber);
        user.setPrivacyPolicyAgreed(privacyPolicyAgreed != null ? privacyPolicyAgreed : false);
        user.setRole(role);
        user.setProvider("LOCAL");
        user.setProviderId("NONE");
        user.setStatus(UserStatus.ACTIVE);
        user.setCandy(0L);

        return user;
    }

    // 회원 탈퇴 (soft delete)
    public void delete() {
        this.deletedAt = LocalDateTime.now();
        this.status = UserStatus.BANNED; // 탈퇴 시 상태를 BANNED로 변경
    }

    //OAuth2 사용자 생성을 위한 정적 팩토리 메서드
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
        // birth는 NOT NULL이라 기본값 넣어줬음.
        // 실제 birth(YYYY-MM-DD)는 OAuth2 서비스에서 birthyear+birthday를 합쳐 setBirth로 갱신합니다.
        user.setBirth("1900-01-01");
        user.setPrivacyPolicyAgreed(true); // OAuth2 로그인 시 동의한 것으로 간주
        // phone_number는 NOT NULL + UNIQUE라 기본값 설정 (없으면 providerId 기반으로 유니크하게 생성)
        user.setPhoneNumber(phoneNumber != null && !phoneNumber.isBlank() ? phoneNumber : ("kakao_" + providerId));
        user.setProfileImageUrl(profileImageUrl);
        user.setRole(UserRole.USER); // 기본 역할은 USER
        user.setProvider(provider);
        user.setProviderId(providerId);
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(LocalDateTime.now());
        user.setCandy(0L);
        return user;
    }

    /** 그룹 계정 여부 (role == GROUP). 별도 컬럼 없이 역할로 판단 */
    public boolean isGroupAccount() {
        return this.role == UserRole.GROUP;
    }

    public void updateOAuth2Info(String provider, String providerId) {
    }

    public void chargeCandy(Long amount) {
        if (this.candy == null) {
            this.candy = 0L;
        }
        this.candy += amount;
    }

    // 캔디사용 로직 추가-결제팀
    public void useCandy(Long amount) {
        if (this.candy == null) {
            this.candy = 0L;
        }
        if (this.candy < amount) {
            throw new BusinessException(UserErrorCode.NOT_ENOUGH_CANDY);
        }
        this.candy -= amount;
    }

}
