package org.example.backend.post.repository;

import org.example.backend.post.entity.FanPost;
import org.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FanPostRepository extends JpaRepository<FanPost, Long> {
    // 유저가 작성한 글 조회 (삭제되지 않은 글만, 최신순)
    Page<FanPost> findByUserAndStatusOrderByCreatedAtDesc(User user, Boolean status, Pageable pageable);

    @Query("SELECT f FROM FanPost f " +
            "JOIN FETCH f.user u " +
            "LEFT JOIN FETCH f.group g " +
            "WHERE f.status = false " +
            "AND (:groupId IS NULL OR f.group.id = :groupId) " +
            "AND (:lastPostId IS NULL OR f.id < :lastPostId) " +
            "ORDER BY f.id DESC")
    List<FanPost> findPosts(@Param("groupId") Long groupId, @Param("lastPostId") Long lastPostId, Pageable pageable);
}
