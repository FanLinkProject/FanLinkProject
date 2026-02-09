package org.example.backend.milestone.repository;

import org.example.backend.milestone.entity.FanProfile;
import org.example.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FanProfileRepository extends JpaRepository<FanProfile, Long> {

    List<FanProfile> findAllByArtist(User artist);

    List<FanProfile> findAllByFan(User fan);

    Optional<FanProfile> findByFanAndArtist(User fan, User artist);

    boolean existsByFanAndArtist(User fan, User artist);
}
