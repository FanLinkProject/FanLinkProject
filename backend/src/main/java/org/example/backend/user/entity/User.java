package org.example.backend.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
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
    private String password; // TODO : 암호화

    @Column(name = "gender", nullable = false)
    private String gender;

    @Column(name = "birth", nullable = false)
    private String birth;

    // 개인정보 처리 동의 여부
    @Column(name = "privacy_policy_agreed", nullable = false)
    private Boolean privacyPolicyAgreed;

    @Column(name = "phone_number", unique = true, nullable = false)
    private String phoneNumber; // TODO : 암호화

    @Column(name = "candy")
    private Long candy;

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
            throw new IllegalArgumentException("Not enough candy");
        }
        this.candy -= amount;
    }

}
