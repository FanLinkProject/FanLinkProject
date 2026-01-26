package org.example.backend.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@NoArgsConstructor
@Getter
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

    @Column(name = "password", nullable = false)
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
    private UserStatus status = UserStatus.ACTIVE;

    // TODO : 글로벌로 생성/수정 설정 오후 스크럼때 확인필요
    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;


}
