package org.example.backend.milestone.repository;

import org.example.backend.milestone.entity.MemberGrade;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberGradeRepository extends JpaRepository<MemberGrade, Long> {
}
