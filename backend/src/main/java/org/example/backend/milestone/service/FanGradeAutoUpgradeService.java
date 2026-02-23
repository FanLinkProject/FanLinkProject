package org.example.backend.milestone.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.milestone.dto.response.AutoUpgradeResultResponse;
import org.example.backend.milestone.entity.FanProfile;
import org.example.backend.milestone.exception.MilestoneErrorCode;
import org.example.backend.milestone.exception.MilestoneException;
import org.example.backend.milestone.entity.Milestone;
import org.example.backend.milestone.repository.FanProfileRepository;
import org.example.backend.milestone.repository.MilestoneRepository;
import org.example.backend.user.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 팬 등급 자동 승급 서비스.
 * 자동승급(autoUpgrade=true)이 설정된 마일스톤 기준으로
 * 모든 팬 프로필을 검사하여 조건 충족 시 등급을 갱신한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FanGradeAutoUpgradeService {

    private final MilestoneRepository milestoneRepository;
    private final FanProfileRepository fanProfileRepository;
    private final MilestoneService milestoneService;

    /**
     * 자동승급 대상 전체 팬에 대해 등급 체크 및 승급을 수행한다.
     * 자동승급이 설정된 마일스톤을 가진 아티스트의 팬들만 대상으로 한다.
     */
    @Transactional
    public AutoUpgradeResultResponse processAutoUpgrade() {
        List<Milestone> autoUpgradeMilestones = milestoneRepository.findByAutoUpgradeTrueAndActiveTrue();
        if (autoUpgradeMilestones.isEmpty()) {
            log.debug("자동승급 대상 마일스톤이 없습니다.");
            return AutoUpgradeResultResponse.builder()
                    .groupCount(0)
                    .fanProcessedCount(0)
                    .build();
        }

        Set<User> groupsWithAutoUpgrade = autoUpgradeMilestones.stream()
                .map(Milestone::getGroup)
                .collect(Collectors.toCollection(HashSet::new));

        int totalProcessed = 0;
        for (User group : groupsWithAutoUpgrade) {
            List<FanProfile> fans = fanProfileRepository.findAllByGroup(group);
            for (FanProfile fan : fans) {
                try {
                    milestoneService.checkAndUpgradeFanGrade(fan);
                    totalProcessed++;
                } catch (Exception e) {
                    log.warn("팬 등급 승급 체크 실패: fanProfileId={}, groupId={}, error={}",
                            fan.getId(), group.getId(), e.getMessage());
                }
            }
        }

        log.info("팬 등급 자동승급 완료: 대상 그룹 {}개, 처리 팬 {}명",
                groupsWithAutoUpgrade.size(), totalProcessed);

        return AutoUpgradeResultResponse.builder()
                .groupCount(groupsWithAutoUpgrade.size())
                .fanProcessedCount(totalProcessed)
                .build();
    }

    /**
     * 특정 팬 프로필에 대해 즉시 등급 체크 및 승급을 수행한다.
     * 게시글/댓글/방문 수 증가 등 이벤트 발생 시 호출할 수 있다.
     */
    @Transactional
    public void checkAndUpgradeForFan(Long fanProfileId) {
        FanProfile fan = fanProfileRepository.findById(fanProfileId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.FANPROFILE_NOT_FOUND));
        milestoneService.checkAndUpgradeFanGrade(fan);
    }
}
