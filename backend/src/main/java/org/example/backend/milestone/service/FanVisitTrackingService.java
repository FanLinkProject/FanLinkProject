package org.example.backend.milestone.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.milestone.repository.FanProfileRepository;
import org.example.backend.user.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * 팬의 아티스트 페이지 방문 추적 서비스
 * - 하루에 한 번만 visitCount 증가
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FanVisitTrackingService {

    private final FanProfileRepository fanProfileRepository;
    private final FanGradeAutoUpgradeService fanGradeAutoUpgradeService;

    // 메모리 기반 방문 기록 (실제 운영 환경에서는 Redis 사용 권장)
    // Key: "fanId:artistId:date", Value: true
    private final Map<String, Boolean> visitCache = new HashMap<>();

    /**
     * 팬이 아티스트 페이지를 방문했을 때 호출
     * - 하루에 한 번만 visitCount 증가
     * 
     * @param fan 팬 User
     * @param artist 아티스트 User
     */
    @Transactional
    public void trackVisit(User fan, User artist) {
        LocalDate today = LocalDate.now();
        String cacheKey = fan.getId() + ":" + artist.getId() + ":" + today;

        // 오늘 이미 방문한 경우 스킵
        if (visitCache.containsKey(cacheKey)) {
            return;
        }

        // FanProfile 조회
        fanProfileRepository.findByFanAndArtist(fan, artist).ifPresent(profile -> {
            profile.increaseVisitCount();
            visitCache.put(cacheKey, true);
            log.info("[방문 추적] 팬={}, 아티스트={}, 방문일수={}", 
                fan.getNickname(), artist.getNickname(), profile.getVisitCount());
            
            // 자동승급 체크
            fanGradeAutoUpgradeService.checkAndUpgradeForFan(profile.getId());
        });
    }

    /**
     * 매일 자정에 방문 캐시 초기화 (스케줄러에서 호출)
     */
    public void clearVisitCache() {
        visitCache.clear();
        log.info("[방문 추적] 방문 캐시 초기화 완료");
    }
}
