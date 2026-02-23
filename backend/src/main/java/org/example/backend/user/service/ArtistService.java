package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.user.dto.request.ArtistProfileUpdateRequest;
import org.example.backend.user.dto.response.ArtistDashboardKpiResponse;
import org.example.backend.user.dto.response.ArtistHomeResponse;
import org.example.backend.user.dto.response.ArtistMyPageResponse;
import org.example.backend.user.entity.GroupMember;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.product.repository.ProductRepository;
import org.example.backend.settlement.repository.SettlementPendingRepository;
import org.example.backend.settlement.service.SettlementDashboardService;
import org.example.backend.user.repository.FollowRepository;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ArtistService {

    private final FollowRepository followRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ArtistPostRepository artistPostRepository;
    private final UserRepository userRepository;
    private final SettlementDashboardService settlementDashboardService;
    private final SettlementPendingRepository settlementPendingRepository;
    private final ProductRepository productRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    @Transactional(readOnly = true)
    public ArtistMyPageResponse getMyPage(User artistOrGroup) {
        if (artistOrGroup.getRole() != UserRole.ARTIST && artistOrGroup.getRole() != UserRole.GROUP) {
            throw new BusinessException(UserErrorCode.FOLLOW_TARGET_NOT_ARTIST);
        }

        GroupMember membership = null;
        User followerStatsTarget = artistOrGroup;
        if (artistOrGroup.getRole() == UserRole.ARTIST) {
            membership = groupMemberRepository.findByMember(artistOrGroup).orElse(null);
            if (membership != null && membership.getGroup() != null) {
                // 그룹 소속 개인 아티스트는 그룹 기준으로 팬 지표를 보여준다.
                followerStatsTarget = membership.getGroup();
            }
        }

        // 1) 프로필
        ArtistMyPageResponse.Profile profile = new ArtistMyPageResponse.Profile(
                artistOrGroup.getId(),
                artistOrGroup.getNickname(),
                artistOrGroup.getProfileImageUrl(),
                artistOrGroup.getBannerImageUrl(),
                artistOrGroup.getBio(),
                artistOrGroup.getOfficialLinks()
        );

        // 2) 팬 수 변화 그래프 (최근 7일 daily 신규 팔로워 수)
        long totalFollowers = followRepository.countByArtist(followerStatsTarget);

        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(6);

        List<Object[]> rows = followRepository.countDailyNewFollowers(followerStatsTarget.getId(), from, to);
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

        // 3) 멤버/팀 정보 (그룹 계정은 제외, ARTIST 역할만 멤버로 표시)
        ArtistMyPageResponse.TeamInfo teamInfo;
        // group 전용 계정이면 멤버 아티스트 정보 알려줌 (네이티브 쿼리로 member_id≠group_id, role=ARTIST만 조회)
        if (artistOrGroup.getRole() == UserRole.GROUP) {
            Long groupId = artistOrGroup.getId();
            List<GroupMember> members = groupMemberRepository.findArtistMembersExcludingGroupSelf(groupId);
            List<ArtistMyPageResponse.Member> memberDtos = members.stream()
                    .filter(gm -> gm.getMember() != null && !gm.getMember().getId().equals(groupId))
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
            // 개인 아티스트: 소속 그룹이 있으면 그 그룹의 멤버 정보까지 조회 (네이티브 쿼리로 그룹 본인 제외)
            if (membership != null) {
                String groupName = membership.getGroupName();
                User group = membership.getGroup();
                Long groupId = group.getId();

                List<GroupMember> members = groupMemberRepository.findArtistMembersExcludingGroupSelf(groupId);
                List<ArtistMyPageResponse.Member> memberDtos = members.stream()
                        .filter(gm -> gm.getMember() != null && !gm.getMember().getId().equals(groupId))
                        .map(gm -> new ArtistMyPageResponse.Member(
                                gm.getMember().getId(),
                                gm.getMember().getNickname(),
                                gm.getMember().getProfileImageUrl()
                        ))
                        .toList();

                teamInfo = new ArtistMyPageResponse.TeamInfo(
                        "ARTIST",
                        groupName,
                        memberDtos
                );
            } else {
                // 소속 그룹이 없는 개인 아티스트
                teamInfo = new ArtistMyPageResponse.TeamInfo(
                        "ARTIST",
                        null,
                        List.of()
                );
            }
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

    /** 아티스트(그룹 포함) 프로필 수정 - 소개, 프로필 이미지, 배너, 공식 링크 */
    public ArtistMyPageResponse.Profile updateArtistProfile(User artistOrGroup, ArtistProfileUpdateRequest request) {
        if (artistOrGroup.getRole() != UserRole.ARTIST && artistOrGroup.getRole() != UserRole.GROUP) {
            throw new BusinessException(UserErrorCode.FOLLOW_TARGET_NOT_ARTIST);
        }
        User user = userRepository.findById(artistOrGroup.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        if (request.bio() != null) {
            user.setBio(request.bio());
        }
        if (request.profileImageUrl() != null) {
            user.setProfileImageUrl(request.profileImageUrl());
        }
        if (request.bannerImageUrl() != null) {
            user.setBannerImageUrl(request.bannerImageUrl());
        }
        if (request.officialLinks() != null) {
            user.setOfficialLinks(request.officialLinks());
        }
        User saved = userRepository.save(user);
        return new ArtistMyPageResponse.Profile(
                saved.getId(),
                saved.getNickname(),
                saved.getProfileImageUrl(),
                saved.getBannerImageUrl(),
                saved.getBio(),
                saved.getOfficialLinks()
        );
    }

    // 아티스트 메인 홈 화면 조회
    @Transactional(readOnly = true)
    public ArtistHomeResponse getArtistHome(User artist) {
        // 팔로워 수 (나를 팔로우하는 유저 수) - 그룹/개인 모두 동일 기준
        long followerCount = followRepository.countByArtist(artist);

        long postCount;

        // 그룹 계정인 경우: 그룹 + 그룹에 속한 모든 멤버 아티스트가 작성한 게시글 수 합산
        if (artist.getRole() == UserRole.GROUP) {
            List<GroupMember> members = groupMemberRepository.findByGroup(artist);

            // 그룹 본인 + 멤버 아티스트들을 모두 대상으로 게시글 수 합산
            List<User> authors = new ArrayList<>();
            authors.add(artist);
            authors.addAll(members.stream().map(GroupMember::getMember).toList());

            long totalPosts = 0L;
            for (User author : authors) {
                long count = artistPostRepository
                        .findByUserAndStatusOrderByCreatedAtDesc(author, false, PageRequest.of(0, 1))
                        .getTotalElements();
                totalPosts += count;
            }
            postCount = totalPosts;
        } else {
            // 개인 아티스트: 본인이 작성한 게시글 수
            postCount = artistPostRepository
                    .findByUserAndStatusOrderByCreatedAtDesc(artist, false, PageRequest.of(0, 1))
                    .getTotalElements();
        }

        // 최근 게시글 조회 (최대 10개, 삭제되지 않은 글만) - 기본적으로 현재 계정이 작성한 글 기준
        List<ArtistPost> recentPosts = artistPostRepository
                .findByUserAndStatusOrderByCreatedAtDesc(artist, false, PageRequest.of(0, 10))
                .getContent();

        List<ArtistHomeResponse.PostStatistics> postStatistics = recentPosts.stream()
                .map(post -> new ArtistHomeResponse.PostStatistics(
                        post.getId(),
                        post.getTitle(),
                        post.getCreatedAt().toString(),
                        0L   // 댓글 수 (추후 구현)
                ))
                .collect(Collectors.toList());

        return new ArtistHomeResponse(followerCount, postCount, postStatistics);
    }

    /**
     * 운영 요약(대시보드) KPI: 이번 달 총 매출, 정산 가능 금액, 배송 대기 건수, 등록 상품 수
     */
    @Transactional(readOnly = true)
    public ArtistDashboardKpiResponse getDashboardKpis(User artistOrGroup) {
        if (artistOrGroup.getRole() != UserRole.ARTIST && artistOrGroup.getRole() != UserRole.GROUP) {
            throw new BusinessException(UserErrorCode.FOLLOW_TARGET_NOT_ARTIST);
        }
        Long artistId = artistOrGroup.getId();

        Instant now = Instant.now();
        ZoneId zone = ZoneId.systemDefault();
        Instant startOfMonth = LocalDate.now(zone).atStartOfDay(zone).toInstant();
        Instant endOfMonth = startOfMonth.plus(1, ChronoUnit.MONTHS);

        long monthlySales = settlementPendingRepository.sumAmountByArtistIdAndPaidAtBetween(
                artistId, startOfMonth, endOfMonth);
        Long estimated = settlementDashboardService.getEstimatedAmount(artistId).getEstimatedAmount();
        long estimatedSettlement = estimated != null ? estimated : 0L;
        int productCount = (int) productRepository.countByArtistId(artistId);

        return new ArtistDashboardKpiResponse(
                monthlySales,
                estimatedSettlement,
                0,  // pendingShipmentCount (주문/배송 미사용)
                productCount
        );
    }
}

