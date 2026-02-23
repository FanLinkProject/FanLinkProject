package org.example.backend.milestone.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.milestone.dto.response.FanProfileResponse;
import org.example.backend.milestone.entity.FanProfile;
import org.example.backend.milestone.exception.MilestoneErrorCode;
import org.example.backend.milestone.exception.MilestoneException;
import org.example.backend.milestone.repository.FanProfileRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FanProfileService {
    private final FanProfileRepository fanProfileRepository;
    private final FanGradeAutoUpgradeService fanGradeAutoUpgradeService;
    private final UserRepository userRepository;

    /**
     * 게시글 수 1 증가 후 자동승급 조건 즉시 체크
     */
    public void increasePostCount(Long fanProfileId) {
        FanProfile fan = getFan(fanProfileId);
        fan.increasePostCount();
        fanGradeAutoUpgradeService.checkAndUpgradeForFan(fanProfileId);
    }

    /**
     * 댓글 수 1 증가 후 자동승급 조건 즉시 체크
     */
    public void increaseCommentCount(Long fanProfileId) {
        FanProfile fan = getFan(fanProfileId);
        fan.increaseCommentCount();
        fanGradeAutoUpgradeService.checkAndUpgradeForFan(fanProfileId);
    }

    /**
     * 게시글 수 1 감소 후 자동승급 조건 즉시 체크 (게시글 삭제 시)
     */
    public void decreasePostCount(Long fanProfileId) {
        FanProfile fan = getFan(fanProfileId);
        fan.decreasePostCount();
        fanGradeAutoUpgradeService.checkAndUpgradeForFan(fanProfileId);
    }

    /**
     * 댓글 수 1 감소 후 자동승급 조건 즉시 체크 (댓글 삭제 시)
     */
    public void decreaseCommentCount(Long fanProfileId) {
        FanProfile fan = getFan(fanProfileId);
        fan.decreaseCommentCount();
        fanGradeAutoUpgradeService.checkAndUpgradeForFan(fanProfileId);
    }

    /**
     * 본인 팬 프로필일 때만 출석 처리 (하루 1회). 이미 오늘 출석했으면 예외.
     */
    public void increaseVisitCount(Long fanProfileId, Long userId) {
        FanProfile profile = getFan(fanProfileId);
        if (!profile.getFan().getId().equals(userId)) {
            throw new MilestoneException(MilestoneErrorCode.NOT_FANPROFILE_OWNER);
        }
        LocalDate today = LocalDate.now();
        if (profile.getLastVisitDate() != null && profile.getLastVisitDate().equals(today)) {
            throw new MilestoneException(MilestoneErrorCode.ALREADY_VISITED_TODAY);
        }
        profile.recordVisit(today);
        fanProfileRepository.save(profile); // 명시적 UPDATE 반영 후 승급 체크
        fanGradeAutoUpgradeService.checkAndUpgradeForFan(fanProfileId);
    }

    private FanProfile getFan(Long id) {
        return fanProfileRepository.findById(id)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.FANPROFILE_NOT_FOUND));
    }

    /**
     * 팬이 자신의 팬 프로필 목록 조회 (그룹별)
     */
    public List<FanProfileResponse> getMyFanProfiles(Long fanUserId) {
        User fan = userRepository.findById(fanUserId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.FANPROFILE_NOT_FOUND));
        return fanProfileRepository.findAllByFan(fan).stream()
                .map(FanProfileResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 팬 프로필 생성 (groupId로 해당 그룹에 대한 프로필 생성)
     */
    public FanProfileResponse createFanProfile(Long fanUserId, Long groupId) {
        User fan = userRepository.findById(fanUserId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.FANPROFILE_NOT_FOUND));
        if (fan.getRole() != UserRole.USER) {
            throw new MilestoneException(MilestoneErrorCode.FAN_ONLY_CREATE_PROFILE);
        }
        User group = userRepository.findById(groupId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.GROUP_NOT_FOUND));
        if (group.getRole() != UserRole.GROUP && group.getRole() != UserRole.ARTIST) {
            throw new MilestoneException(MilestoneErrorCode.NOT_GROUP_USER);
        }
        if (fanProfileRepository.existsByFanAndGroup(fan, group)) {
            return FanProfileResponse.from(fanProfileRepository.findByFanAndGroup(fan, group).orElseThrow());
        }
        FanProfile profile = FanProfile.builder()
                .fan(fan)
                .group(group)
                .postCount(0)
                .commentCount(0)
                .visitCount(0)
                .joinDays(0)
                .build();
        return FanProfileResponse.from(fanProfileRepository.save(profile));
    }
}
