package org.example.backend.like.dto;

/**
 * 좋아요 상태 응답 DTO
 * @param likeCount 총 좋아요 개수
 * @param isLiked 현재 사용자의 좋아요 여부
 */
public record LikeStatusResponse(
        long likeCount,
        boolean isLiked
) {}
