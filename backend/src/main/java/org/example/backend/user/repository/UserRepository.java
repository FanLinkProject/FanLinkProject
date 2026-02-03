package org.example.backend.user.repository;

import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // 로그인을 위한 이메일 조회
    Optional<User> findByEmail(String email);
    
    // 중복가입 체크
    boolean existsByEmail(String email);
    boolean existsByNickname(String nickname);
    boolean existsByPhoneNumber(String phoneNumber);
    //Page<User> findByNicknameContaining(String nickname, Pageable pageable);
    
    // 역할 조회
    Page<User> findByRole(UserRole role, Pageable pageable);
    
    // 상태 조회
    Page<User> findByStatus(UserStatus status, Pageable pageable);

    // OAuth2 사용자 조회
    Optional<User> findByProviderAndProviderId(String provider, String providerId);
}
