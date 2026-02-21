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

    // OAuth2 사용자 조회
    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    // 관리자 홈 : 전체 가입자 수 (탈퇴하지 않은 유저)
    long countByDeletedAtIsNull();

    // 관리자 홈 : 오늘 신규 가입자 수
    @Query("SELECT COUNT(u) FROM User u WHERE DATE(u.createdAt) = CURRENT_DATE AND u.deletedAt IS NULL")
    long countNewUsersToday();

    // 관리자 홈 : 오늘 가입한 유저 수 (DAU 근사치)
    @Query("SELECT COUNT(DISTINCT u.id) FROM User u WHERE DATE(u.createdAt) = CURRENT_DATE AND u.deletedAt IS NULL")
    long countDau();

    // 관리자 홈 : 최근 30일간 가입한 유저 수 (MAU 근사치)
    @Query("SELECT COUNT(DISTINCT u.id) FROM User u WHERE u.createdAt >= :startDate AND u.deletedAt IS NULL")
    long countMau(@Param("startDate") java.time.LocalDateTime startDate);

    // 관리자 홈 : 개인 아티스트 수 (GROUP 제외)
    long countByRoleAndDeletedAtIsNull(UserRole role);

    // 비로그인 홈용: 새로운 아티스트 (최근 가입한 아티스트, ACTIVE 상태, 탈퇴하지 않은 유저)
    Page<User> findByRoleAndStatusAndDeletedAtIsNullOrderByCreatedAtDesc(
            UserRole role,
            UserStatus status,
            Pageable pageable
    );

    // 비로그인 홈용: 추천 아티스트 (랜덤 아티스트, ACTIVE 상태, 탈퇴하지 않은 유저)
    // ARTIST 또는 GROUP 역할인 유저를 랜덤으로 조회
    @Query(value = "SELECT * FROM users u " +
           "WHERE (u.role = :artistRole OR u.role = :groupRole) " +
           "AND u.status = :status " +
           "AND u.deleted_at IS NULL " +
           "ORDER BY RAND()",
           nativeQuery = true)
    Page<User> findRecommendedArtists(
            @Param("artistRole") String artistRole,
            @Param("groupRole") String groupRole,
            @Param("status") String status,
            Pageable pageable
    );

    // 관리자: 회원 목록 (탈퇴 제외, 페이징)
    Page<User> findByDeletedAtIsNullOrderByCreatedAtDesc(Pageable pageable);
    Page<User> findByRoleAndDeletedAtIsNullOrderByCreatedAtDesc(UserRole role, Pageable pageable);

    // 관리자: 회원 검색 (닉네임 또는 이메일)
    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL AND (LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))) ORDER BY u.createdAt DESC")
    Page<User> findForAdminUserSearch(@Param("keyword") String keyword, Pageable pageable);
    @Query("SELECT u FROM User u WHERE u.role = :role AND u.deletedAt IS NULL AND (LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))) ORDER BY u.createdAt DESC")
    Page<User> findForAdminUserSearchByRole(@Param("role") UserRole role, @Param("keyword") String keyword, Pageable pageable);

    // 관리자: 아티스트/그룹 목록 (ARTIST, GROUP 역할, 탈퇴 제외, 페이징)
    Page<User> findByRoleInAndDeletedAtIsNullOrderByCreatedAtDesc(java.util.List<UserRole> roles, Pageable pageable);

    // 관리자: 아티스트/그룹 검색 (닉네임)
    @Query("SELECT u FROM User u WHERE u.role IN :roles AND u.deletedAt IS NULL AND LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%')) ORDER BY u.createdAt DESC")
    Page<User> findForAdminArtistSearch(@Param("roles") java.util.List<UserRole> roles, @Param("keyword") String keyword, Pageable pageable);
}
