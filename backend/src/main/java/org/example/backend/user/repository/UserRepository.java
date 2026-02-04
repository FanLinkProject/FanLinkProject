package org.example.backend.user.repository;

import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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
    
    // 아티스트 검색 (닉네임 또는 그룹명으로 검색, ACTIVE 상태만)
    @Query("SELECT DISTINCT u FROM User u " +
           "LEFT JOIN GroupMember gm ON gm.member = u " +
           "WHERE u.role = :role " +
           "AND u.status = :status " +
           "AND u.deletedAt IS NULL " +
           "AND (u.nickname LIKE CONCAT('%', :keyword, '%') OR gm.groupName LIKE CONCAT('%', :keyword, '%'))")
    Page<User> findArtistsByNicknameOrGroupName(
            @Param("role") UserRole role,
            @Param("status") UserStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );
    
    // 아티스트 전체 목록 조회 (ACTIVE 상태만)
    Page<User> findByRoleAndStatusAndDeletedAtIsNull(
            UserRole role,
            UserStatus status,
            Pageable pageable
    );
}
