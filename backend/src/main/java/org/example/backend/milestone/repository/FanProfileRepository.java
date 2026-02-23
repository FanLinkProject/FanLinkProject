package org.example.backend.milestone.repository;

import org.example.backend.milestone.entity.FanProfile;
import org.example.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FanProfileRepository extends JpaRepository<FanProfile, Long> {

    List<FanProfile> findAllByGroup(User group);

    List<FanProfile> findAllByFan(User fan);

    Optional<FanProfile> findByFanAndGroup(User fan, User group);

    boolean existsByFanAndGroup(User fan, User group);

    /** 댓글/게시글 파트에서 사용 (그룹 기준) */
    Optional<FanProfile> findByFan_IdAndGroup_Id(Long fanId, Long groupId);
}
