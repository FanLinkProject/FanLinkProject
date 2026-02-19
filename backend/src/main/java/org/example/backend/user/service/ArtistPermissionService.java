package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.GroupMemberRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ArtistPermissionService {

    private final GroupMemberRepository groupMemberRepository;

    // 팬페이지 관리 계정 여부를 판단한다.
    public boolean isManageAccount(Long userId, UserRole role) {
        if (userId == null || role == null) {
            return false;
        }
        if (role == UserRole.GROUP) {
            return true;
        }
        if (role != UserRole.ARTIST) {
            return false;
        }
        return !groupMemberRepository.existsByMemberId(userId);
    }
}
