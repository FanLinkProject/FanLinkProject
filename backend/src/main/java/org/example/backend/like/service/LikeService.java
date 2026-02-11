package org.example.backend.like.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.comment.repository.CommentRepository;
import org.example.backend.like.dto.LikeRequest;
import org.example.backend.like.entity.Like;
import org.example.backend.like.enums.LikeTarget;
import org.example.backend.like.exception.LikeErrorCode;
import org.example.backend.like.exception.LikeException;
import org.example.backend.like.repository.LikeRepository;
import org.example.backend.post.repository.ArtistPostRepository;
import org.example.backend.post.repository.FanPostRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LikeService {

    private final LikeRepository likeRepository;
    private final FanPostRepository fanPostRepository;
    private final ArtistPostRepository artistPostRepository;
    private final CommentRepository commentRepository;

    /**
     * 좋아요 토글 (좋아요 등록/취소)
     * - 대상 존재 여부 검증
     * - 동시성 문제 처리 (DataIntegrityViolationException)
     *
     * @param userId 사용자 ID
     * @param request 좋아요 요청 DTO
     * @return true: 좋아요 등록됨, false: 좋아요 취소됨
     */
    @Transactional
    public boolean toggleLike(Long userId, LikeRequest request) {
        // 1. 대상 존재 여부 검증
        validateTargetExists(request.targetType(), request.targetId());

        try {
            // 2. 좋아요 토글 로직
            return likeRepository.findByUserIdAndTargetTypeAndTargetId(
                            userId, request.targetType(), request.targetId())
                    .map(like -> {
                        likeRepository.delete(like); // 이미 있으면 삭제 (좋아요 취소)
                        return false; // 현재 상태: 좋아요 x
                    })
                    .orElseGet(() -> {
                        Like newLike = Like.builder()
                                .userId(userId)
                                .targetType(request.targetType())
                                .targetId(request.targetId())
                                .build();
                        likeRepository.save(newLike); // 없으면 저장 (좋아요)
                        return true; // 현재 상태: 좋아요 o
                    });

        } catch (DataIntegrityViolationException e) {
            // 3. 동시성 이슈 처리: 유니크 키 위반 시 재조회 후 삭제
            log.warn("동시성 이슈 발생 - userId: {}, targetType: {}, targetId: {}",
                    userId, request.targetType(), request.targetId());

            return likeRepository.findByUserIdAndTargetTypeAndTargetId(
                            userId, request.targetType(), request.targetId())
                    .map(like -> {
                        likeRepository.delete(like);
                        return false;
                    })
                    .orElse(true); // 예외 상황이지만 일관성 유지
        }
    }

    /**
     * 사용자가 특정 대상에 좋아요를 눌렀는지 확인
     *
     * @param userId 사용자 ID
     * @param targetType 좋아요 대상 타입
     * @param targetId 좋아요 대상 ID
     * @return 좋아요 여부
     */
    public boolean isLiked(Long userId, LikeTarget targetType, Long targetId) {
        return likeRepository.existsByUserIdAndTargetTypeAndTargetId(
                userId, targetType, targetId);
    }

    /**
     * 좋아요 상태 조회 (개수 + 내가 좋아요 했는지)
     * - 게시물 상세 화면에서 사용
     *
     * @param userId 사용자 ID
     * @param targetType 좋아요 대상 타입
     * @param targetId 좋아요 대상 ID
     * @return 좋아요 상태 (개수, 좋아요 여부)
     */
    public org.example.backend.like.dto.LikeStatusResponse getLikeStatus(
            Long userId, LikeTarget targetType, Long targetId) {
        long count = likeRepository.countByTargetTypeAndTargetId(targetType, targetId);
        boolean isLiked = likeRepository.existsByUserIdAndTargetTypeAndTargetId(
                userId, targetType, targetId);

        return new org.example.backend.like.dto.LikeStatusResponse(count, isLiked);
    }

    /**
     * 여러 게시물의 좋아요 수를 한 번에 조회 (N+1 문제 해결)
     * - 게시물 목록 화면에서 사용
     * - 1회의 쿼리로 여러 게시물의 좋아요 수를 조회
     *
     * @param targetType 좋아요 대상 타입
     * @param targetIds 대상 ID 목록
     * @return Map<targetId, 좋아요 개수>
     */
    public java.util.Map<Long, Long> getLikeCounts(LikeTarget targetType, java.util.List<Long> targetIds) {
        if (targetIds == null || targetIds.isEmpty()) {
            return java.util.Map.of();
        }

        return likeRepository.countByTargetTypeAndTargetIds(targetType, targetIds)
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),  // targetId (Number로 캐스팅 후 longValue)
                        row -> ((Number) row[1]).longValue()   // count (Number로 캐스팅 후 longValue)
                ));
    }

    /**
     * 여러 게시물에 대한 사용자의 좋아요 여부를 한 번에 조회 (N+1 문제 해결)
     * - 게시물 목록 화면에서 사용
     *
     * @param userId 사용자 ID
     * @param targetType 좋아요 대상 타입
     * @param targetIds 대상 ID 목록
     * @return 좋아요를 누른 대상 ID 목록
     */
    public java.util.List<Long> getLikedTargetIds(
            Long userId, LikeTarget targetType, java.util.List<Long> targetIds) {
        if (targetIds == null || targetIds.isEmpty()) {
            return java.util.List.of();
        }

        return likeRepository.findLikedTargetIds(userId, targetType, targetIds);
    }

    /**
     * 좋아요 대상이 실제로 존재하는지 검증
     * - 삭제된 게시물/댓글에는 좋아요를 누를 수 없음
     *
     * @param targetType 좋아요 대상 타입
     * @param targetId 좋아요 대상 ID
     * @throws LikeException 대상이 존재하지 않거나 삭제된 경우
     */
    private void validateTargetExists(LikeTarget targetType, Long targetId) {
        switch (targetType) {
            case FAN_POST -> fanPostRepository.findById(targetId)
                    .filter(post -> !post.getStatus()) // status가 false인 것만 (활성 상태)
                    .orElseThrow(() -> new LikeException(LikeErrorCode.TARGET_NOT_FOUND));

            case ARTIST_POST -> artistPostRepository.findById(targetId)
                    .filter(post -> !post.getStatus()) // status가 false인 것만 (활성 상태)
                    .orElseThrow(() -> new LikeException(LikeErrorCode.TARGET_NOT_FOUND));

            case COMMENT -> commentRepository.findById(targetId)
                    .filter(comment -> comment.getStatus() == 1) // status가 1인 것만 (활성 상태)
                    .orElseThrow(() -> new LikeException(LikeErrorCode.TARGET_NOT_FOUND));
        }
    }
}
