package org.example.backend.comment.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.request.CommentCreateRequest;
import org.example.backend.comment.dto.response.CommentResponse;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.enums.TargetType;
import org.example.backend.comment.exception.CommentErrorCode;
import org.example.backend.comment.exception.CommentException;
import org.example.backend.comment.repository.CommentRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.GroupMemberRepository;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;

    /**
     * 부모 댓글 목록 조회
     * - 유저 정보(닉네임, 역할, 프로필) Bulk Fetch
     * - 아티스트 답글 존재 여부 일괄 조회
     */
    public Slice<CommentResponse> getComments(TargetType targetType, Long targetId, Long lastId, Pageable pageable) {
        Slice<Comment> comments = commentRepository.findRootComments(targetType, targetId, lastId, pageable);

        // 1. 작성자 정보 일괄 조회 (ID -> User)
        Map<Long, User> userMap = getUserMap(comments.getContent());

        // 2. 아티스트 답글이 있는 부모 댓글 ID 일괄 조회
        Set<Long> artistRepliedParentIds = getArtistRepliedParentIds(comments.getContent());

        // 3. DTO 변환
        List<CommentResponse> content = comments.getContent().stream()
                .map(comment -> CommentResponse.of(
                        comment,
                        userMap.get(comment.getUserId()),
                        artistRepliedParentIds.contains(comment.getId())
                ))
                .toList();

        return new SliceImpl<>(content, pageable, comments.hasNext());
    }

    /**
     * 더보기 클릭 시 특정 부모의 대댓글 목록만 조회 (No-offset)
     */
    public Slice<CommentResponse> getReplies(Long parentId, Long lastId, Pageable pageable) {
        Slice<Comment> replies = commentRepository.findReplies(parentId, lastId, pageable);

        Map<Long, User> userMap = getUserMap(replies.getContent());

        List<CommentResponse> content = replies.getContent().stream()
                .map(reply -> CommentResponse.ofReply(reply, userMap.get(reply.getUserId())))
                .toList();

        return new SliceImpl<>(content, pageable, replies.hasNext());
    }

    @Transactional
    public Long create(CommentCreateRequest request, Long userId) {
        Comment parent = null;
        if (request.parentId() != null) {
            parent = commentRepository.findById(request.parentId())
                    .filter(p -> p.getStatus() == 1)
                    .orElseThrow(() -> new CommentException(CommentErrorCode.PARENT_COMMENT_NOT_FOUND));

            // 2단계 깊이 제한: 대댓글에 답글 불가
            if (parent.getParent() != null) throw new CommentException(CommentErrorCode.REPLY_NOT_ALLOWED);
        }

        Comment comment = Comment.builder()
                .userId(userId)
                .targetId(request.targetId())
                .targetType(request.targetType())
                .content(request.content())
                .parent(parent)
                .build();

        return commentRepository.save(comment).getId();
    }

    /**
     * 댓글 수정 — 작성자 본인만 가능
     */
    @Transactional
    public void update(Long commentId, String content, Long userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));
        if (!comment.getUserId().equals(userId)) {
            throw new CommentException(CommentErrorCode.UNAUTHORIZED_ACCESS);
        }
        comment.update(content);
    }

    /**
     * 댓글 삭제 — 작성자 본인 / 관리자 / 게시판 주체(그룹) / 소속 아티스트 가능
     */
    @Transactional
    public void delete(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));
        validateAuthority(comment, currentUser);
        comment.delete();
    }

    // ──────────────────────────────────────────────
    // Private Helper Methods
    // ──────────────────────────────────────────────

    /**
     * 댓글 작성자 정보 일괄 조회 (Bulk Fetch)
     * - 닉네임뿐 아니라 역할(role), 프로필 이미지 등 전체 User 정보를 매핑
     */
    private Map<Long, User> getUserMap(List<Comment> comments) {
        List<Long> userIds = comments.stream()
                .map(Comment::getUserId)
                .distinct()
                .toList();

        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    /**
     * 아티스트(ARTIST/GROUP) 역할 유저가 답글을 단 부모 댓글 ID Set 조회
     * - 쿼리 1회로 해당 페이지 부모 댓글 전체에 대해 일괄 판별
     * - 댓글이 없거나 부모 ID가 없으면 빈 Set 반환
     */
    private Set<Long> getArtistRepliedParentIds(List<Comment> parentComments) {
        List<Long> parentIds = parentComments.stream()
                .map(Comment::getId)
                .toList();

        if (parentIds.isEmpty()) return Set.of();

        return new HashSet<>(commentRepository.findParentIdsWithArtistReply(parentIds));
    }

    /**
     * 도메인 특화 권한 검증
     * 1) 작성자 본인
     * 2) 관리자 (ADMIN 역할)
     * 3) 게시판 주체 — 그룹 역할 유저이며 targetId가 본인 ID와 일치
     * 4) 소속 아티스트 — 아티스트 역할이며 자신이 속한 그룹의 ID가 targetId와 일치
     */
    private void validateAuthority(Comment comment, User currentUser) {
        // 1. 작성자 본인
        if (comment.getUserId().equals(currentUser.getId())) return;

        // 2. 관리자
        if (currentUser.getRole() == UserRole.ADMIN) return;

        // 3. 게시판 주체 (그룹 유저)
        if (currentUser.getRole() == UserRole.GROUP
                && currentUser.getId().equals(comment.getTargetId())) {
            return;
        }

        // 4. 소속 아티스트
        if (currentUser.getRole() == UserRole.ARTIST) {
            boolean isSameGroup = groupMemberRepository.findByMember(currentUser)
                    .map(gm -> gm.getGroup().getId().equals(comment.getTargetId()))
                    .orElse(false);
            if (isSameGroup) return;
        }

        throw new CommentException(CommentErrorCode.UNAUTHORIZED_ACCESS);
    }
}
