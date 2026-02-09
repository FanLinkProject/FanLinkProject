package org.example.backend.milestone.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.example.backend.milestone.dto.request.MilestoneConditionRequest;
import org.example.backend.milestone.dto.request.MilestoneRequest;
import org.example.backend.milestone.dto.response.MilestoneResponse;
import org.example.backend.milestone.entity.FanProfile;
import org.example.backend.milestone.entity.Milestone;
import org.example.backend.milestone.entity.MilestoneCondition;
import org.example.backend.milestone.exception.MilestoneErrorCode;
import org.example.backend.milestone.exception.MilestoneException;
import org.example.backend.milestone.repository.MemberGradeRepository;
import org.example.backend.milestone.repository.MilestoneConditionRepository;
import org.example.backend.milestone.repository.MilestoneRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MilestoneService {
    private final UserRepository userRepository;
    private final MilestoneRepository milestoneRepository;
    private final MilestoneConditionRepository conditionRepository;
    private final MemberGradeRepository memberGradeRepository;

    /**
     * 아티스트가 마일스톤(등급)을 생성한다.
     */
    public MilestoneResponse createMilestone(MilestoneRequest request) {

        // ========== 1) 아티스트 조회 ==========
        User artist = userRepository.findById(request.getArtistId())
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.ARTIST_NOT_FOUND));

        if (!artist.getRole().equals(UserRole.ARTIST)) {
            throw new MilestoneException(MilestoneErrorCode.NOT_ARTIST_USER);
        }

        // ========== 2) 중복 검증 ==========
        boolean nameExists = milestoneRepository.existsByArtist_IdAndName(request.getArtistId(), request.getName());
        if (nameExists) {
            throw new MilestoneException(MilestoneErrorCode.DUPLICATE_MILESTONE_NAME);
        }

        boolean sortExists = milestoneRepository.existsByArtist_IdAndSortOrder(request.getArtistId(), request.getSortOrder());
        if (sortExists) {
            throw new MilestoneException(MilestoneErrorCode.DUPLICATE_SORT_ORDER);
        }

        // ========== 3) Milestone 생성 ==========
        Milestone milestone = Milestone.builder()
                .artist(artist)
                .name(request.getName())
                .description(request.getDescription())
                .sortOrder(request.getSortOrder())
                .autoUpgrade(request.isAutoUpgrade())
                .active(request.isActive())
                .build();

        milestoneRepository.save(milestone);

        // ========== 4) 조건 생성 ==========
        if (request.getConditions() != null && !request.getConditions().isEmpty()) {

            for (MilestoneConditionRequest cr : request.getConditions()) {

                MilestoneCondition condition = MilestoneCondition.builder()
                        .milestone(milestone)
                        .type(cr.getType())
                        .requiredValue(cr.getRequiredValue())
                        .build();

                conditionRepository.save(condition);
            }
        } else {
            throw new MilestoneException(MilestoneErrorCode.EMPTY_CONDITION_LIST);
        }

        return MilestoneResponse.from(milestone);
    }

    /**
     * 아티스트별 마일스톤 목록을 조회한다. (sortOrder 내림차순)
     */
    public List<MilestoneResponse> getMilestonesByArtist(Long artistId) {
        User artist = userRepository.findById(artistId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.ARTIST_NOT_FOUND));
        List<Milestone> milestones = milestoneRepository.findAllByArtistOrderBySortOrderDesc(artist);
        return milestones.stream()
                .map(MilestoneResponse::from)
                .toList();
    }

    /**
     * 아티스트가 마일스톤(등급)을 업데이트한다.
     */
    public MilestoneResponse updateMilestone(Long milestoneId, MilestoneRequest request) {

        // 1) 마일스톤 조회
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.MILESTONE_NOT_FOUND));

        // 2) 아티스트 검증
        if (!milestone.getArtist().getId().equals(request.getArtistId())) {
            throw new MilestoneException(MilestoneErrorCode.NOT_MILESTONE_OWNER);
        }

        // 3) 중복 검증 (이름/순서 변경 시만)
        if (!milestone.getName().equals(request.getName())) {
            boolean nameExists = milestoneRepository.existsByArtist_IdAndName(
                    request.getArtistId(), request.getName()
            );
            if (nameExists) {
                throw new MilestoneException(MilestoneErrorCode.DUPLICATE_MILESTONE_NAME);
            }
        }

        if (!milestone.getSortOrder().equals(request.getSortOrder())) {
            boolean sortExists = milestoneRepository.existsByArtist_IdAndSortOrder(
                    request.getArtistId(), request.getSortOrder()
            );
            if (sortExists) {
                throw new MilestoneException(MilestoneErrorCode.DUPLICATE_SORT_ORDER);
            }
        }

        // 4) 엔티티 정보 수정
        milestone.updateInfo(
                request.getName(),
                request.getDescription(),
                request.getSortOrder(),
                request.isAutoUpgrade(),
                request.isActive()
        );

        // 5) 조건 전체 교체 방식 (Clear & Insert)
        conditionRepository.deleteByMilestoneId(milestone.getId());

        if (request.getConditions() == null || request.getConditions().isEmpty()) {
            throw new MilestoneException(MilestoneErrorCode.EMPTY_CONDITION_LIST);
        }

        for (MilestoneConditionRequest cr : request.getConditions()) {
            MilestoneCondition condition = MilestoneCondition.builder()
                    .milestone(milestone)
                    .type(cr.getType())
                    .requiredValue(cr.getRequiredValue())
                    .build();

            conditionRepository.save(condition);
        }
        return MilestoneResponse.from(milestone);
    }

    /**
     * 아티스트가 마일스톤(등급)을 삭제한다.
     */
    public MilestoneResponse deleteMilestone(Long milestoneId, Long artistId) {

        // 1) 마일스톤 조회
        Milestone milestone = milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new MilestoneException(MilestoneErrorCode.MILESTONE_NOT_FOUND));

        // 2) 소유자 검증
        if (!milestone.getArtist().getId().equals(artistId)) {
            throw new MilestoneException(MilestoneErrorCode.NOT_MILESTONE_OWNER);
        }

        // 3) 사용 중인지 여부 판단 (정책에 따라 수정)
        if (milestone.isActive()) {
            throw new MilestoneException(MilestoneErrorCode.CANNOT_DELETE_ACTIVE_MILESTONE);
        }

        // 4) 삭제
        milestoneRepository.delete(milestone);

        return MilestoneResponse.from(milestone);
    }

    /**
     * 조건을 만족하면 승급, 미충족 시 등급 제거 (등급 없음)
     */
    public void checkAndUpgradeFanGrade(FanProfile fan) {
        List<Milestone> milestones =
                milestoneRepository.findAllByArtistOrderBySortOrderDesc(fan.getArtist());

        for (Milestone milestone : milestones) {
            if (!milestone.isAutoUpgrade()) continue;

            boolean satisfied = milestone.getConditions().stream()
                    .allMatch(c -> c.isSatisfiedBy(fan));

            if (satisfied) {
                fan.updateGrade(milestone);
                return;
            }
        }

        if (fan.getGrade() != null) {
            memberGradeRepository.delete(fan.getGrade());
            fan.clearGrade();
        }
    }

}
