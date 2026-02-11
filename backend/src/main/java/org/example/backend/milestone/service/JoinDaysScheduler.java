package org.example.backend.milestone.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.milestone.entity.FanProfile;
import org.example.backend.milestone.repository.FanProfileRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 가입일수(joinDays) 자동 증가 스케줄러
 * - 매일 자정에 모든 FanProfile의 joinDays를 1씩 증가
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JoinDaysScheduler {

    private final FanProfileRepository fanProfileRepository;
    private final FanGradeAutoUpgradeService fanGradeAutoUpgradeService;
    private final FanVisitTrackingService fanVisitTrackingService;

    /**
     * 매일 자정(00:00:00)에 실행
     * - 모든 FanProfile의 joinDays를 1씩 증가
     * - 자동승급 조건 체크
     */
    @Scheduled(cron = "0 0 0 * * *") // 매일 자정
    @Transactional
    public void incrementJoinDays() {
        log.info("[가입일수 스케줄러] 시작");
        
        List<FanProfile> allProfiles = fanProfileRepository.findAll();
        int count = 0;
        
        for (FanProfile profile : allProfiles) {
            profile.increaseJoinDays();
            count++;
            
            // 자동승급 체크 (배치 처리)
            try {
                fanGradeAutoUpgradeService.checkAndUpgradeForFan(profile.getId());
            } catch (Exception e) {
                log.error("[가입일수 스케줄러] 자동승급 실패: fanProfileId={}", profile.getId(), e);
            }
        }
        
        log.info("[가입일수 스케줄러] 완료: {}개 프로필 업데이트", count);
        
        // 방문 캐시 초기화
        fanVisitTrackingService.clearVisitCache();
    }

    /**
     * 테스트용: 수동으로 가입일수 증가 실행
     */
    @Transactional
    public void manualIncrementJoinDays() {
        log.info("[가입일수 수동 실행] 시작");
        incrementJoinDays();
    }
}
