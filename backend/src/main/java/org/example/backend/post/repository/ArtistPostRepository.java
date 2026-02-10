package org.example.backend.post.repository;

import org.example.backend.post.entity.ArtistPost;
import org.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtistPostRepository extends JpaRepository<ArtistPost, Long> {
    // 아티스트가 작성한 글 조회 (삭제되지 않은 글만, 최신순)
    Page<ArtistPost> findByUserAndStatusOrderByCreatedAtDesc(User user, Boolean status, Pageable pageable);
}
