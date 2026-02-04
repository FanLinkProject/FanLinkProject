package org.example.backend.user.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 개발 환경용 초기 관리자 계정 생성
 * 
 * <p>애플리케이션 시작 시 관리자 계정이 없으면 자동으로 생성합니다.</p>
 * <p>개발 환경(dev, local)에서만 동작합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Profile({"dev", "local", "default"}) // 개발 환경에서만 동작
public class AdminDataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEFAULT_ADMIN_EMAIL = "admin@example.com";
    private static final String DEFAULT_ADMIN_PASSWORD = "admin123";
    private static final String DEFAULT_ADMIN_NICKNAME = "관리자";
    private static final String DEFAULT_ADMIN_NAME = "관리자";
    private static final String DEFAULT_ADMIN_PHONE = "010-0000-0000";

    @Override
    public void run(String... args) {
        // 관리자 계정이 이미 존재하는지 확인
        if (userRepository.existsByEmail(DEFAULT_ADMIN_EMAIL)) {
            log.info("관리자 계정이 이미 존재합니다: {}", DEFAULT_ADMIN_EMAIL);
            return;
        }

        // 관리자 계정 생성
        User admin = User.of(
                DEFAULT_ADMIN_EMAIL,
                DEFAULT_ADMIN_NICKNAME,
                DEFAULT_ADMIN_NAME,
                passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD),
                "M",
                "1990-01-01",
                DEFAULT_ADMIN_PHONE,
                true,
                UserRole.ADMIN
        );

        admin.setStatus(UserStatus.ACTIVE);
        userRepository.save(admin);

        log.info("========================================");
        log.info("초기 관리자 계정이 생성되었습니다.");
        log.info("이메일: {}", DEFAULT_ADMIN_EMAIL);
        log.info("비밀번호: {}", DEFAULT_ADMIN_PASSWORD);
        log.info("========================================");
    }
}
