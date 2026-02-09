package org.example.backend.milestone.repository;

import org.example.backend.milestone.entity.Milestone;
import org.example.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
    boolean existsByArtist_IdAndName(Long artistId, String name);

    boolean existsByArtist_IdAndSortOrder(Long artistId, Integer sortOrder);

    List<Milestone> findAllByArtistOrderBySortOrderDesc(User artist);

    List<Milestone> findByAutoUpgradeTrueAndActiveTrue();
}
