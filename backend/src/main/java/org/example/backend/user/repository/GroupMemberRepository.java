package org.example.backend.user.repository;

import org.example.backend.user.entity.GroupMember;
import org.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 그룹 멤버 관계 Repository
 */
@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

    // 그룹에 속한 멤버 조회
    Page<GroupMember> findByGroup(User group, Pageable pageable);

    // 특정 멤버가 속한 그룹 조회
    Optional<GroupMember> findByMember(User member);

    boolean existsByGroupAndMember(User group, User member);

    // 그룹명 조회
    Optional<GroupMember> findByGroupName(String groupName);

    // 그룹명 중복 조회
    boolean existsByGroupName(String groupName);

    // 그룹의 모든 멤버 조회
    List<GroupMember> findByGroup(User group);
}
