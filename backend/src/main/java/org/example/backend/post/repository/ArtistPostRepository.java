package org.example.backend.post.repository;
import org.example.backend.user.enums.UserRole;

import org.example.backend.post.entity.ArtistPost;
import org.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ArtistPostRepository extends JpaRepository<ArtistPost, Long> {
    // 아티스트가 작성한 글 조회 (삭제되지 않은 글만, 최신순)
    Page<ArtistPost> findByUserAndStatusOrderByCreatedAtDesc(User user, Boolean status, Pageable pageable);

    long countByUserAndStatus(User user, Boolean status);

    @Query("SELECT a FROM ArtistPost a " +
            "JOIN FETCH a.user u " +
            "LEFT JOIN FETCH a.group g " +
            "WHERE a.status = false " +
            "AND (:groupId IS NULL OR a.group.id = :groupId) " +
            "AND (:lastPostId IS NULL OR a.id < :lastPostId) " +
            "ORDER BY a.id DESC")
    List<ArtistPost> findPosts(@Param("groupId") Long groupId, @Param("lastPostId") Long lastPostId, Pageable pageable);

    // 공지사항(서비스 전체): group 없고 isNotice=true인 글 (관리자 공지)
    @Query("SELECT a FROM ArtistPost a " +
            "JOIN FETCH a.user u " +
            "LEFT JOIN FETCH a.group g " +
            "WHERE a.status = false " +
            "AND a.group IS NULL " +
            "AND a.isNotice = true " +
            "AND (:lastPostId IS NULL OR a.id < :lastPostId) " +
            "ORDER BY a.id DESC")
    List<ArtistPost> findNotices(@Param("lastPostId") Long lastPostId, Pageable pageable);

    // 공지사항(그룹 페이지): 해당 페이지에 속한 글 중 isNotice=true
    @Query("SELECT a FROM ArtistPost a " +
            "JOIN FETCH a.user u " +
            "LEFT JOIN FETCH a.group g " +
            "WHERE a.status = false " +
            "AND ((a.group IS NOT NULL AND a.group.id = :groupId) OR a.user.id = :groupId) " +
            "AND a.isNotice = true " +
            "AND (:lastPostId IS NULL OR a.id < :lastPostId) " +
            "ORDER BY a.id DESC")
    List<ArtistPost> findNoticesByGroupId(@Param("groupId") Long groupId, @Param("lastPostId") Long lastPostId,
            Pageable pageable);

    // 공지사항(개인 아티스트 페이지): 해당 아티스트가 공지로 지정한 글만 조회
    @Query("SELECT a FROM ArtistPost a " +
            "JOIN FETCH a.user u " +
            "LEFT JOIN FETCH a.group g " +
            "WHERE a.status = false " +
            "AND a.user.id = :artistId " +
            "AND a.isNotice = true " +
            "AND (:lastPostId IS NULL OR a.id < :lastPostId) " +
            "ORDER BY a.id DESC")
    List<ArtistPost> findNoticesByArtistId(@Param("artistId") Long artistId, @Param("lastPostId") Long lastPostId,
            Pageable pageable);

    // 아티스트 게시글(Group이 있는 글) 조회 - 공지사항 제외
    @Query("SELECT a FROM ArtistPost a " +
            "JOIN FETCH a.user u " +
            "LEFT JOIN FETCH a.group g " +
            "WHERE a.status = false " +
            "AND a.group IS NOT NULL " +
            "AND (:groupId IS NULL OR a.group.id = :groupId) " +
            "AND (:lastPostId IS NULL OR a.id < :lastPostId) " +
            "ORDER BY a.id DESC")
    List<ArtistPost> findArtistPosts(@Param("groupId") Long groupId, @Param("lastPostId") Long lastPostId,
            Pageable pageable);

    // 특정 아티스트가 직접 작성한 그룹 포스트 조회 (내가 쓴 글 관리용)
    @Query("SELECT a FROM ArtistPost a " +
            "JOIN FETCH a.user u " +
            "LEFT JOIN FETCH a.group g " +
            "WHERE a.status = false " +
            "AND a.group IS NOT NULL " +
            "AND a.user.id = :writerId " +
            "AND (:lastPostId IS NULL OR a.id < :lastPostId) " +
            "ORDER BY a.id DESC")
    List<ArtistPost> findMyArtistPosts(@Param("writerId") Long writerId,
            @Param("lastPostId") Long lastPostId, Pageable pageable);

    // 그룹 계정 + 소속 멤버가 작성한 포스트 수 (삭제되지 않은 글만)
    @Query("SELECT COUNT(a) FROM ArtistPost a WHERE a.status = false " +
            "AND (a.user.id = :groupId OR a.group.id = :groupId)")
    long countByGroupId(@Param("groupId") Long groupId);
}
