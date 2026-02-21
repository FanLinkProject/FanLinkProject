package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ArtistPermissionService {

    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

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

    /**
     * 해당 팬페이지(artistId)에 대한 업로드/관리 권한이 있는지 판단한다.
     *
     * @param artistId           팬페이지 ID (소유자 userId와 동일)
     * @param userId             현재 사용자 ID
     * @param role               현재 사용자 역할
     * @param includeGroupMembers true면 그룹 페이지일 때 소속 아티스트도 허용
     * @return 권한 있으면 true
     */
    public boolean canManagePage(Long artistId, Long userId, UserRole role, boolean includeGroupMembers) {
        if (artistId == null || userId == null || role == null) {
            return false;
        }
        if (role != UserRole.ARTIST && role != UserRole.GROUP) {
            return false;
        }
        User owner = userRepository.findById(artistId).orElse(null);
        if (owner == null) {
            return false;
        }
        if (owner.getRole() == UserRole.GROUP) {
            if (artistId.equals(userId)) {
                return true;
            }
            if (includeGroupMembers && role == UserRole.ARTIST) {
                return groupMemberRepository.existsByGroup_IdAndMember_Id(artistId, userId);
            }
            return false;
        }
        return artistId.equals(userId);
    }
}
