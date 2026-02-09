package org.example.backend.like.repository;

import org.example.backend.like.entity.Like;
import org.example.backend.like.enums.LikeTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LikeRepository extends JpaRepository<Like, Long> {
    /**
     * 좋아요 존재 여부 확인
     */
    boolean existsByUserIdAndTargetTypeAndTargetId(Long userId, LikeTarget targetType, Long targetId);

    /**
     * 좋아요 조회 (삭제용)
     */
    Optional<Like> findByUserIdAndTargetTypeAndTargetId(Long userId, LikeTarget targetType, Long targetId);

    /**
     * 특정 대상의 총 좋아요 수 조회
     */
    long countByTargetTypeAndTargetId(LikeTarget targetType, Long targetId);

    /**
     * 여러 대상의 좋아요 수를 한 번에 조회 (N+1 문제 해결)
     * - IN 절 + GROUP BY로 한 번의 쿼리로 처리
     * - 게시물 목록 화면에서 각 게시물의 좋아요 수 표시용
     *
     * @param targetType 좋아요 대상 타입
     * @param targetIds 대상 ID 목록
     * @return [targetId, count] 형태의 배열 리스트
     */
    @Query("SELECT l.targetId, COUNT(l) FROM Like l " +
           "WHERE l.targetType = :targetType AND l.targetId IN :targetIds " +
           "GROUP BY l.targetId")
    List<Object[]> countByTargetTypeAndTargetIds(
            @Param("targetType") LikeTarget targetType,
            @Param("targetIds") List<Long> targetIds
    );

    /**
     * 여러 대상에 대한 사용자의 좋아요 여부를 한 번에 조회 (N+1 문제 해결)
     * - 게시물 목록에서 사용자가 각 게시물에 좋아요를 눌렀는지 확인용
     *
     * @param userId 사용자 ID
     * @param targetType 좋아요 대상 타입
     * @param targetIds 대상 ID 목록
     * @return 좋아요를 누른 대상 ID 목록
     */
    @Query("SELECT l.targetId FROM Like l " +
           "WHERE l.userId = :userId AND l.targetType = :targetType " +
           "AND l.targetId IN :targetIds")
    List<Long> findLikedTargetIds(
            @Param("userId") Long userId,
            @Param("targetType") LikeTarget targetType,
            @Param("targetIds") List<Long> targetIds
    );
}