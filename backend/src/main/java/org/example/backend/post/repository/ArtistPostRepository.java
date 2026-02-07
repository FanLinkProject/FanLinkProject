package org.example.backend.post.repository;

import org.example.backend.post.entity.ArtistPost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArtistPostRepository extends JpaRepository<ArtistPost, Long> {
}
