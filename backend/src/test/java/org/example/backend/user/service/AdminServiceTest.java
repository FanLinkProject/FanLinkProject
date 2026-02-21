package org.example.backend.user.service;

import org.example.backend.user.dto.request.ArtistCreateRequest;
import org.example.backend.user.dto.response.SignupResponse;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private org.example.backend.global.security.jwt.JwtTokenProvider jwtTokenProvider;
    @Mock
    private org.example.backend.global.security.jwt.RefreshTokenStore refreshTokenStore;
    @Mock
    private org.example.backend.user.repository.PenaltyRepository penaltyRepository;
    @Mock
    private org.example.backend.user.repository.ReportRepository reportRepository;
    @Mock
    private GroupMemberRepository groupMemberRepository;

    @InjectMocks
    private AdminService adminService;

    private static ArtistCreateRequest baseRequest() {
        return new ArtistCreateRequest(
                "artist@test.com",
                "테스트아티스트",
                "홍길동",
                "password1!",
                "MALE",
                "1990-01-01",
                true,
                "010-1234-5678",
                false,
                null,
                null
        );
    }

    @Test
    @DisplayName("아티스트 계정 생성 시 channelArn 이 있으면 User 엔티티에 저장된다")
    void createArtistAccount_setsChannelArn_whenProvided() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(userRepository.existsByNickname(any())).thenReturn(false);
        when(userRepository.existsByPhoneNumber(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        when(jwtTokenProvider.createAccessToken(any(), any())).thenReturn("access");
        when(jwtTokenProvider.createRefreshToken(any(), any())).thenReturn("refresh");

        ArtistCreateRequest request = new ArtistCreateRequest(
                baseRequest().email(),
                baseRequest().nickname(),
                baseRequest().name(),
                baseRequest().password(),
                baseRequest().gender(),
                baseRequest().birth(),
                baseRequest().privacyPolicyAgreed(),
                baseRequest().phoneNumber(),
                baseRequest().isGroup(),
                baseRequest().groupId(),
                "arn:aws:ivs:ap-northeast-2:123456789012:channel/abc123"
        );

        SignupResponse response = adminService.createArtistAccount(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getChannelArn()).isEqualTo("arn:aws:ivs:ap-northeast-2:123456789012:channel/abc123");
        assertThat(response).isNotNull();
    }

    @Test
    @DisplayName("아티스트 계정 생성 시 channelArn 이 없으면 User 엔티티의 channelArn 은 null 이다")
    void createArtistAccount_channelArnNull_whenNotProvided() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(userRepository.existsByNickname(any())).thenReturn(false);
        when(userRepository.existsByPhoneNumber(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        when(jwtTokenProvider.createAccessToken(any(), any())).thenReturn("access");
        when(jwtTokenProvider.createRefreshToken(any(), any())).thenReturn("refresh");

        ArtistCreateRequest request = baseRequest();

        adminService.createArtistAccount(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getChannelArn()).isNull();
    }

    @Test
    @DisplayName("아티스트 계정 생성 시 channelArn 이 빈 문자열이면 User 엔티티에 설정하지 않는다")
    void createArtistAccount_channelArnNull_whenBlank() {
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(userRepository.existsByNickname(any())).thenReturn(false);
        when(userRepository.existsByPhoneNumber(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        when(jwtTokenProvider.createAccessToken(any(), any())).thenReturn("access");
        when(jwtTokenProvider.createRefreshToken(any(), any())).thenReturn("refresh");

        ArtistCreateRequest request = new ArtistCreateRequest(
                baseRequest().email(),
                baseRequest().nickname(),
                baseRequest().name(),
                baseRequest().password(),
                baseRequest().gender(),
                baseRequest().birth(),
                baseRequest().privacyPolicyAgreed(),
                baseRequest().phoneNumber(),
                baseRequest().isGroup(),
                baseRequest().groupId(),
                "   "
        );

        adminService.createArtistAccount(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertThat(savedUser.getChannelArn()).isNull();
    }
}
