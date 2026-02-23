package org.example.backend.user.repository;

import org.example.backend.user.entity.Follow;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    boolean existsByFollowerAndArtist(User follower, User artist);

    Optional<Follow> findByFollowerAndArtist(User follower, User artist);

    Page<Follow> findByFollower(User follower, Pageable pageable);

    // 팬 홈용: 팔로우 중인 아티스트 중 그룹 계정만 조회
    Page<Follow> findByFollowerAndArtist_Role(User follower, UserRole artistRole, Pageable pageable);

    long countByArtist(User artist);

    // 아티스트/그룹의 일별 신규 팔로워 수 (그래프용)
    @Query(value = """
        select date(f.created_at) as date, count(*) as count
        from follows f
        where f.artist_id = :artistId
          and f.created_at >= :fromDate
          and f.created_at < date_add(:toDate, interval 1 day)
        group by date(f.created_at)
        order by date(f.created_at) asc
    """, nativeQuery = true)
    List<Object[]> countDailyNewFollowers(
            @Param("artistId") Long artistId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );
}

