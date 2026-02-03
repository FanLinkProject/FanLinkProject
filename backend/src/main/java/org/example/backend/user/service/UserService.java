package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.dto.request.PasswordUpdateRequest;
import org.example.backend.user.dto.request.PhoneNumberUpdateRequest;
import org.example.backend.user.dto.request.UserProfileUpdateRequest;
import org.example.backend.user.dto.response.ArtistSearchResponse;
import org.example.backend.user.dto.response.UserProfileResponse;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.BlockRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final BlockRepository blockRepository;
    private final VerificationCodeService verificationCodeService;
    private final PasswordEncoder passwordEncoder;

    // 전화번호 수정
    public void updatePhoneNumber(User user, PhoneNumberUpdateRequest request) {
        // 전화번호 인증 확인
        if (!verificationCodeService.verifyPhoneCode(request.phoneNumber(), request.verificationCode())) {
            throw new BusinessException(UserErrorCode.PHONE_VERIFICATION_FAILED);
        }

        // 전화번호 중복 확인 (다른 사용자가 사용 중인지 확인)
        if (!user.getPhoneNumber().equals(request.phoneNumber()) 
                && userRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
        }

        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        currentUser.setPhoneNumber(request.phoneNumber());
        userRepository.save(currentUser);
    }

    // 프로필 조회
    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(User user) {
        return UserProfileResponse.from(user);
    }

    // 프로필 수정
    public UserProfileResponse updateProfile(User user, UserProfileUpdateRequest request) {
        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 닉네임 변경 시 중복 확인
        if (request.nickname() != null && !request.nickname().equals(currentUser.getNickname())) {
            if (userRepository.existsByNickname(request.nickname())) {
                throw new BusinessException(UserErrorCode.NICKNAME_ALREADY_EXISTS);
            }
            currentUser.setNickname(request.nickname());
        }

        // 프로필 이미지 URL 업데이트
        if (request.profileImageUrl() != null) {
            currentUser.setProfileImageUrl(request.profileImageUrl());
        }

        User savedUser = userRepository.save(currentUser);
        return UserProfileResponse.from(savedUser);
    }

    // 비밀번호 변경
    public void updatePassword(User user, PasswordUpdateRequest request) {
        User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));

        // 현재 비밀번호 검증
        if (!passwordEncoder.matches(request.currentPassword(), currentUser.getPassword())) {
            throw new BusinessException(UserErrorCode.PASSWORD_MISMATCH);
        }

        // 새 비밀번호 암호화 후 저장
        currentUser.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(currentUser);
    }

    // 아티스트 목록 조회 및 검색
    @Transactional(readOnly = true)
    public Page<ArtistSearchResponse> getArtists(String nickname, Pageable pageable) {
        Page<User> artists;
        
        if (nickname != null && !nickname.trim().isEmpty()) {
            // 닉네임으로 검색
            artists = userRepository.findByRoleAndNicknameContainingAndStatusAndDeletedAtIsNull(
                    UserRole.ARTIST,
                    nickname.trim(),
                    UserStatus.ACTIVE,
                    pageable
            );
        } else {
            // 전체 목록 조회
            artists = userRepository.findByRoleAndStatusAndDeletedAtIsNull(
                    UserRole.ARTIST,
                    UserStatus.ACTIVE,
                    pageable
            );
        }
        
        return artists.map(ArtistSearchResponse::from);
    }
}
