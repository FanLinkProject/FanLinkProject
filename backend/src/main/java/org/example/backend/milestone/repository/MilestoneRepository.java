package org.example.backend.milestone.repository;

import org.example.backend.milestone.entity.Milestone;
import org.example.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
    boolean existsByGroup_IdAndName(Long groupId, String name);

    boolean existsByGroup_IdAndSortOrder(Long groupId, Integer sortOrder);

    List<Milestone> findAllByGroupOrderBySortOrderDesc(User group);

    List<Milestone> findByAutoUpgradeTrueAndActiveTrue();
}
