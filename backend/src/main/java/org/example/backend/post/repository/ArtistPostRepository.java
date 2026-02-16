package org.example.backend.post.repository;

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

    @Query("SELECT a FROM ArtistPost a " +
            "JOIN FETCH a.user u " +
            "LEFT JOIN FETCH a.group g " +
            "WHERE a.status = false " +
            "AND (:groupId IS NULL OR a.group.id = :groupId) " +
            "AND (:lastPostId IS NULL OR a.id < :lastPostId) " +
            "ORDER BY a.id DESC")
    List<ArtistPost> findPosts(@Param("groupId") Long groupId, @Param("lastPostId") Long lastPostId, Pageable pageable);

    // 공지사항(Group이 없는 글) 조회
    @Query("SELECT a FROM ArtistPost a " +
            "JOIN FETCH a.user u " +
            "LEFT JOIN FETCH a.group g " +
            "WHERE a.status = false " +
            "AND a.group IS NULL " +
            "AND (:lastPostId IS NULL OR a.id < :lastPostId) " +
            "ORDER BY a.id DESC")
    List<ArtistPost> findNotices(@Param("lastPostId") Long lastPostId, Pageable pageable);

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
}
