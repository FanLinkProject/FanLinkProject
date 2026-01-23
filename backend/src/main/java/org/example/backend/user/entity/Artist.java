package org.example.backend.user.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDateTime;

@Entity
public class Artist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    // 활동명
    @Column(name = "stage_name", unique = true, nullable = false)
    private String stageName;

    // 실명
    @Column(name="name", nullable = false)
    private String name;

    @Column(name = "password", nullable = false)
    private String password; // TODO : 암호화

    @Column(name = "gender", nullable = false)
    private String gender;

    @Column(name = "birth", nullable = false)
    private String birth;

    @Column(name = "privacy_policy_agreed", nullable = false)
    private Boolean privacyPolicyAgreed;

    @Column(name = "phone_number", unique = true, nullable = false)
    private String phoneNumber; // TODO : 암호화

    @Column(name = "candy")
    private Integer candy;

    @Column(name = "profile_image_url")
    private String profileImageUrl; // TODO :  URL주소 추가 필요

    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /*
    @Column(name = "banner_image_url")
    private String bannerImageUrl;//
    */

}
