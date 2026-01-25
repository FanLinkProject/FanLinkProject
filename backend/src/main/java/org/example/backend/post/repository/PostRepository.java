package org.example.backend.post.repository;

import org.example.backend.post.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {
    // 특정 아티스트 채널의 게시글 목록 조회 (페이징 포함)
    Page<Post> findAllByChannelArtistId(Long channelArtistId, Pageable pageable);
}