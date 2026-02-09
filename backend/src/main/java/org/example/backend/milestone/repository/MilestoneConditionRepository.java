package org.example.backend.milestone.repository;

import org.example.backend.milestone.entity.MilestoneCondition;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MilestoneConditionRepository extends JpaRepository<MilestoneCondition, Long> {
    void deleteByMilestoneId(Long id);
}
