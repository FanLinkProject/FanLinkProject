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
     * 방문 수 1 증가 후 자동승급 조건 즉시 체크
     */
    public void increaseVisitCount(Long fanProfileId) {
        FanProfile fan = getFan(fanProfileId);
        fan.increaseVisitCount();
        fanGradeAutoUpgradeService.checkAndUpgradeForFan(fanProfileId);
    }

    /**
     * 가입일수 1 증가 후 자동승급 조건 즉시 체크 (테스트용)
     */
    public void increaseJoinDays(Long fanProfileId) {
        FanProfile fan = getFan(fanProfileId);
        fan.increaseJoinDays();
        fanGradeAutoUpgradeService.checkAndUpgradeForFan(fanProfileId);
    }

    private FanProfile getFan(Long id) {
        return fanProfileRepository.findById(id)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.FANPROFILE_NOT_FOUND));
    }

    /**
     * 팬이 자신의 팬 프로필 목록 조회 (아티스트별)
     */
    public List<FanProfileResponse> getMyFanProfiles(Long fanUserId) {
        User fan = userRepository.findById(fanUserId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.FANPROFILE_NOT_FOUND));
        return fanProfileRepository.findAllByFan(fan).stream()
                .map(FanProfileResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 팬 프로필 생성 (테스트용 - 아티스트 구독 시 등으로 대체 예정)
     */
    public FanProfileResponse createFanProfile(Long fanUserId, Long artistId) {
        User fan = userRepository.findById(fanUserId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.FANPROFILE_NOT_FOUND));
        User artist = userRepository.findById(artistId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.ARTIST_NOT_FOUND));
        if (artist.getRole() != UserRole.ARTIST) {
            throw new MilestoneException(MilestoneErrorCode.ARTIST_NOT_FOUND);
        }
        if (fanProfileRepository.existsByFanAndArtist(fan, artist)) {
            return FanProfileResponse.from(fanProfileRepository.findByFanAndArtist(fan, artist).orElseThrow());
        }
        FanProfile profile = FanProfile.builder()
                .fan(fan)
                .artist(artist)
                .postCount(0)
                .commentCount(0)
                .visitCount(0)
                .joinDays(0)
                .build();
        return FanProfileResponse.from(fanProfileRepository.save(profile));
    }
}
