package org.example.backend.user.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.user.entity.GroupMember;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 개발용 더미 사용자 생성 (chat 더미 데이터 연동)
 * - fan1@fanlink.test, artist1@fanlink.test 등
 * - 그룹 계정 및 그룹 멤버 생성
 * - 비밀번호: Pass!1234 (BCrypt 서버 인코딩)
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Profile({"dev", "local", "default"})
public class DemoDataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEMO_PASSWORD = "Pass!1234";

    @Override
    @Transactional
    public void run(String... args) {
        // 기존 팬 계정
        createIfNotExists("fan1@fanlink.test", "FAN_ALL", "김팬올", "FEMALE", "2001-07-12", "010-3000-0001", UserRole.USER);
        createIfNotExists("fan2@fanlink.test", "FAN_TWO", "박팬투", "MALE", "2000-01-05", "010-3000-0002", UserRole.USER);
        createIfNotExists("fan3@fanlink.test", "FAN_ONE", "이팬원", "FEMALE", "2002-09-30", "010-3000-0003", UserRole.USER);
        
        // 기존 개인 아티스트 계정
        createIfNotExists("artist1@fanlink.test", "LUNA", "루나", "FEMALE", "1997-05-16", "010-2000-0001", UserRole.ARTIST);
        createIfNotExists("artist2@fanlink.test", "RIO", "리오", "MALE", "1995-11-03", "010-2000-0002", UserRole.ARTIST);
        createIfNotExists("artist3@fanlink.test", "HANEUL", "하늘", "FEMALE", "1999-02-20", "010-2000-0003", UserRole.ARTIST);

        // ============================================================
        // 그룹 계정 생성
        // ============================================================
        createIfNotExists("group.stellar@fanlink.test", "STELLAR_Official", "스텔라", "UNKNOWN", "2020-01-01", "010-9000-0001", UserRole.GROUP);
        createIfNotExists("group.neondreams@fanlink.test", "NEONDREAMS_Official", "네온 드림즈", "UNKNOWN", "2019-05-15", "010-9000-0002", UserRole.GROUP);
        createIfNotExists("group.cosmicboys@fanlink.test", "COSMICBOYS_Official", "코스믹 보이즈", "UNKNOWN", "2021-03-20", "010-9000-0003", UserRole.GROUP);

        // ============================================================
        // 그룹 멤버 아티스트 계정 생성
        // ============================================================
        // 스텔라 멤버들
        createIfNotExists("artist.stella.yuna@fanlink.test", "YUNA_Stellar", "윤아", "FEMALE", "1999-08-12", "010-9001-0001", UserRole.ARTIST);
        createIfNotExists("artist.stella.mina@fanlink.test", "MINA_Stellar", "미나", "FEMALE", "2000-03-22", "010-9001-0002", UserRole.ARTIST);
        createIfNotExists("artist.stella.sora@fanlink.test", "SORA_Stellar", "소라", "FEMALE", "2001-11-05", "010-9001-0003", UserRole.ARTIST);

        // 네온 드림즈 멤버들
        createIfNotExists("artist.neon.kai@fanlink.test", "KAI_Neon", "카이", "MALE", "1998-06-15", "010-9002-0001", UserRole.ARTIST);
        createIfNotExists("artist.neon.leo@fanlink.test", "LEO_Neon", "레오", "MALE", "1997-09-30", "010-9002-0002", UserRole.ARTIST);

        // 코스믹 보이즈 멤버들
        createIfNotExists("artist.cosmic.jay@fanlink.test", "JAY_Cosmic", "제이", "MALE", "1996-12-08", "010-9003-0001", UserRole.ARTIST);
        createIfNotExists("artist.cosmic.max@fanlink.test", "MAX_Cosmic", "맥스", "MALE", "1999-04-18", "010-9003-0002", UserRole.ARTIST);
        createIfNotExists("artist.cosmic.zen@fanlink.test", "ZEN_Cosmic", "젠", "MALE", "2000-07-25", "010-9003-0003", UserRole.ARTIST);
        createIfNotExists("artist.cosmic.rio@fanlink.test", "RIO_Cosmic", "리오", "MALE", "2001-02-14", "010-9003-0004", UserRole.ARTIST);

        // ============================================================
        // 그룹 멤버 관계 생성
        // ============================================================
        createGroupMembership("group.stellar@fanlink.test", "artist.stella.yuna@fanlink.test", "스텔라");
        createGroupMembership("group.stellar@fanlink.test", "artist.stella.mina@fanlink.test", "스텔라");
        createGroupMembership("group.stellar@fanlink.test", "artist.stella.sora@fanlink.test", "스텔라");

        createGroupMembership("group.neondreams@fanlink.test", "artist.neon.kai@fanlink.test", "네온 드림즈");
        createGroupMembership("group.neondreams@fanlink.test", "artist.neon.leo@fanlink.test", "네온 드림즈");

        createGroupMembership("group.cosmicboys@fanlink.test", "artist.cosmic.jay@fanlink.test", "코스믹 보이즈");
        createGroupMembership("group.cosmicboys@fanlink.test", "artist.cosmic.max@fanlink.test", "코스믹 보이즈");
        createGroupMembership("group.cosmicboys@fanlink.test", "artist.cosmic.zen@fanlink.test", "코스믹 보이즈");
        createGroupMembership("group.cosmicboys@fanlink.test", "artist.cosmic.rio@fanlink.test", "코스믹 보이즈");

        // 그룹 계정 자체도 GroupMember에 추가 (그룹 = 멤버로 자기 자신 등록)
        createGroupMembership("group.stellar@fanlink.test", "group.stellar@fanlink.test", "스텔라");
        createGroupMembership("group.neondreams@fanlink.test", "group.neondreams@fanlink.test", "네온 드림즈");
        createGroupMembership("group.cosmicboys@fanlink.test", "group.cosmicboys@fanlink.test", "코스믹 보이즈");
    }

    private void createIfNotExists(String email, String nickname, String name, String gender, String birth, String phone, UserRole role) {
        if (userRepository.existsByEmail(email)) {
            User user = userRepository.findByEmail(email).orElseThrow();
            if (!passwordEncoder.matches(DEMO_PASSWORD, user.getPassword())) {
                user.setPassword(passwordEncoder.encode(DEMO_PASSWORD));
                log.info("[DemoDataLoader] 비밀번호 갱신: {}", email);
            }
            return;
        }

        User user = User.of(
                email,
                nickname,
                name,
                passwordEncoder.encode(DEMO_PASSWORD),
                gender,
                birth,
                phone,
                true,
                role
        );
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        log.info("[DemoDataLoader] 더미 계정 생성: {} ({})", email, role);
    }

    private void createGroupMembership(String groupEmail, String memberEmail, String groupName) {
        User group = userRepository.findByEmail(groupEmail).orElse(null);
        User member = userRepository.findByEmail(memberEmail).orElse(null);

        if (group == null || member == null) {
            log.warn("[DemoDataLoader] 그룹 멤버십 생성 실패 (유저 없음): {} -> {}", groupEmail, memberEmail);
            return;
        }

        // 이미 존재하는 관계면 스킵
        if (groupMemberRepository.existsByGroupAndMember(group, member)) {
            log.debug("[DemoDataLoader] 그룹 멤버십 이미 존재: {} -> {}", groupName, memberEmail);
            return;
        }

        try {
            GroupMember groupMember = new GroupMember();
            groupMember.setGroup(group);
            groupMember.setMember(member);
            groupMember.setGroupName(groupName);
            groupMemberRepository.save(groupMember);
            
            log.info("[DemoDataLoader] 그룹 멤버십 생성: {} -> {} ({})", groupName, member.getNickname(), memberEmail);
        } catch (Exception e) {
            // 중복 키 예외 등을 무시 (이미 존재하는 경우)
            log.debug("[DemoDataLoader] 그룹 멤버십 생성 스킵 (이미 존재 또는 중복): {} -> {}", groupName, memberEmail);
        }
    }
}
