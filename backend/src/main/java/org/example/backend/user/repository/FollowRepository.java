package org.example.backend.user.repository;

import org.example.backend.user.entity.Follow;
import org.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FollowRepository extends JpaRepository<Follow, Long> {
    boolean existsByFollowerAndArtist(User follower, User artist);

    Optional<Follow> findByFollowerAndArtist(User follower, User artist);

    Page<Follow> findByFollower(User follower, Pageable pageable);

    long countByArtist(User artist);
}

