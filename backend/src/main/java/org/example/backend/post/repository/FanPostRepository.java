package org.example.backend.post.repository;

import org.example.backend.post.entity.FanPost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FanPostRepository extends JpaRepository<FanPost, Long> {
}
