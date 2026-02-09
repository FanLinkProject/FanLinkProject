package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.dto.response.ArtistMyPageResponse;
import org.example.backend.user.entity.GroupMember;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.FollowRepository;
import org.example.backend.user.repository.GroupMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class ArtistService {

    private final FollowRepository followRepository;
    private final GroupMemberRepository groupMemberRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    @Transactional(readOnly = true)
    public ArtistMyPageResponse getMyPage(User artistOrGroup) {
        if (artistOrGroup.getRole() != UserRole.ARTIST && artistOrGroup.getRole() != UserRole.GROUP) {
            throw new BusinessException(UserErrorCode.FOLLOW_TARGET_NOT_ARTIST);
        }

        // 1) 프로필
        ArtistMyPageResponse.Profile profile = new ArtistMyPageResponse.Profile(
                artistOrGroup.getId(),
                artistOrGroup.getNickname(),
                artistOrGroup.getProfileImageUrl(),
                artistOrGroup.getBannerImageUrl(),
                artistOrGroup.getBio()
        );

        // 2) 팬 수 변화 그래프 (최근 7일 daily 신규 팔로워 수)
        long totalFollowers = followRepository.countByArtist(artistOrGroup);

        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(6);

        List<Object[]> rows = followRepository.countDailyNewFollowers(artistOrGroup.getId(), from, to);
        Map<String, Long> dateToCount = new HashMap<>();
        for (Object[] row : rows) {
            // row[0] = date (java.sql.Date or String), row[1] = count (Number)
            String date = String.valueOf(row[0]);
            long count = ((Number) row[1]).longValue();
            dateToCount.put(date, count);
        }

        List<ArtistMyPageResponse.DailyPoint> points = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate d = from.plusDays(i);
            String key = d.format(DATE_FORMATTER);
            long c = dateToCount.getOrDefault(key, 0L);
            points.add(new ArtistMyPageResponse.DailyPoint(key, c));
        }

        ArtistMyPageResponse.FanDailyGraph fanDailyGraph = new ArtistMyPageResponse.FanDailyGraph(
                totalFollowers,
                points
        );

        // 3) 멤버/팀 정보
        ArtistMyPageResponse.TeamInfo teamInfo;
        // group 전용 계정이면 멤버 아티스트 정보 알려줌
        if (artistOrGroup.getRole() == UserRole.GROUP) {
            List<GroupMember> members = groupMemberRepository.findByGroup(artistOrGroup);
            List<ArtistMyPageResponse.Member> memberDtos = members.stream()
                    .map(gm -> new ArtistMyPageResponse.Member(
                            gm.getMember().getId(),
                            gm.getMember().getNickname(),
                            gm.getMember().getProfileImageUrl()
                    ))
                    .toList();

            teamInfo = new ArtistMyPageResponse.TeamInfo(
                    "GROUP",
                    artistOrGroup.getNickname(),
                    memberDtos
            );
        } else {
            // 개인 아티스트는 소속 그룹이 있으면 소속그룹명만 알려줌
            String groupName = groupMemberRepository.findByMember(artistOrGroup)
                    .map(GroupMember::getGroupName)
                    .orElse(null);

            teamInfo = new ArtistMyPageResponse.TeamInfo(
                    "ARTIST",
                    groupName,
                    List.of()
            );
        }

        // 4) 계정 보안 (기존 비밀번호 변경 API로 연결)
        ArtistMyPageResponse.Security security = new ArtistMyPageResponse.Security("/api/user/password");

        // 5) 정산 요약 (기존 정산 API로 연결)
        ArtistMyPageResponse.SettlementSummary settlementSummary = new ArtistMyPageResponse.SettlementSummary(
                "/api/settlements/estimated",
                "/api/settlements/history"
        );

        return new ArtistMyPageResponse(
                profile,
                fanDailyGraph,
                teamInfo,
                security,
                settlementSummary
        );
    }
}

