package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.dto.request.PhoneNumberUpdateRequest;
import org.example.backend.user.entity.User;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final VerificationCodeService verificationCodeService;

    // 전화번호 수정
    public void updatePhoneNumber(User user, PhoneNumberUpdateRequest request) {
        // 전화번호 인증 확인
        boolean isPhoneVerified = verificationCodeService.verifyPhoneCode(
                request.phoneNumber(),
                request.verificationCode()
        );
        
        if (!isPhoneVerified) {
            throw new BusinessException(UserErrorCode.PHONE_VERIFICATION_FAILED);
        }

        // 전화번호 중복 확인 (다른 사용자가 사용 중인지 확인)
        User existingUser = userRepository.findByEmail(user.getEmail())
                .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
        
        // 다른 사용자가 이미 사용 중인 전화번호인지 확인
        // (현재 사용자의 전화번호가 아니면서 다른 사용자가 사용 중인 경우)
        if (!existingUser.getPhoneNumber().equals(request.phoneNumber())) {
            if (userRepository.existsByPhoneNumber(request.phoneNumber())) {
                throw new BusinessException(UserErrorCode.PHONE_NUMBER_ALREADY_EXISTS);
            }
        }

        // 전화번호 업데이트
        existingUser.setPhoneNumber(request.phoneNumber());
        userRepository.save(existingUser);
    }
}
