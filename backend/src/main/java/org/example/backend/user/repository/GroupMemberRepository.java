package org.example.backend.user.repository;

import org.example.backend.user.entity.GroupMember;
import org.example.backend.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // [정산] 특정 멤버(ARTIST)가 속한 그룹의 그룹명 조회
    @Query("SELECT gm.groupName FROM GroupMember gm WHERE gm.member.id = :memberId")
    Optional<String> findGroupNameByMemberId(@Param("memberId") Long memberId);

    // [정산] 특정 그룹 유저(GROUP)의 그룹명 조회
    @Query("SELECT gm.groupName FROM GroupMember gm WHERE gm.group.id = :groupId")
    Optional<String> findGroupNameByGroupId(@Param("groupId") Long groupId);

    // [정산] 여러 멤버(ARTIST)의 소속 그룹명 일괄 조회 (N+1 방지)
    @Query("SELECT gm.member.id, gm.groupName FROM GroupMember gm WHERE gm.member.id IN :memberIds")
    List<Object[]> findGroupNamesByMemberIds(@Param("memberIds") List<Long> memberIds);

    // [정산] 여러 그룹 유저(GROUP)의 그룹명 일괄 조회 (N+1 방지)
    @Query("SELECT gm.group.id, gm.groupName FROM GroupMember gm WHERE gm.group.id IN :groupIds")
    List<Object[]> findGroupNamesByGroupIds(@Param("groupIds") List<Long> groupIds);
}
