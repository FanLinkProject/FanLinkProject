package org.example.backend.comment.repository;

import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.enums.TargetType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * 특정 게시물의 최상위 댓글만 최신순으로 조회 (No-offset 무한 스크롤)
     * - 활성 댓글이거나, 삭제되었더라도 활성 자식이 있는 경우만 포함
     */
    @Query("SELECT c FROM Comment c " +
            "WHERE c.targetType = :targetType AND c.targetId = :targetId " +
            "AND c.parent IS NULL " +
            "AND (c.status = 1 OR EXISTS (SELECT ch FROM Comment ch WHERE ch.parent = c AND ch.status = 1)) " +
            "AND (:lastId IS NULL OR c.id < :lastId) " +
            "ORDER BY c.id DESC")
    Slice<Comment> findRootComments(
            @Param("targetType") TargetType targetType,
            @Param("targetId") Long targetId,
            @Param("lastId") Long lastId,
            Pageable pageable
    );

    /**
     * 특정 부모 댓글의 자식(대댓글)들만 조회 (No-offset 무한 스크롤)
     */
    @Query("SELECT c FROM Comment c " +
            "WHERE c.parent.id = :parentId AND c.status = 1 " +
            "AND (:lastId IS NULL OR c.id > :lastId) " +
            "ORDER BY c.id ASC")
    Slice<Comment> findReplies(
            @Param("parentId") Long parentId,
            @Param("lastId") Long lastId,
            Pageable pageable
    );


    /**
     * 게시글 삭제 시 해당 게시글의 모든 댓글 상태를 일괄 변경 (벌크 연산)
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Comment c SET c.status = :status WHERE c.targetType = :type AND c.targetId = :id")
    void updateStatusByTarget(@Param("type") TargetType type, @Param("id") Long id, @Param("status") Integer status);



    /**
     * 여러 게시물의 활성 댓글 수를 한 번에 조회 (Bulk Count)
     * - 부모 댓글 + 대댓글 모두 포함 (활성 상태만)
     * - 게시물 목록 화면에서 댓글 수 표시용
     */
    @Query("SELECT c.targetId, COUNT(c) FROM Comment c " +
            "WHERE c.targetType = :targetType " +
            "AND c.targetId IN :targetIds " +
            "AND c.status = 1 " +
            "GROUP BY c.targetId")
    List<Object[]> countByTargetTypeAndTargetIds(
            @Param("targetType") TargetType targetType,
            @Param("targetIds") List<Long> targetIds
    );

    /**
     * 아티스트(ARTIST/GROUP) 역할 유저가 답글을 단 부모 댓글 ID 목록 조회
     * - 부모 댓글 목록 조회 시 "아티스트 답글 있음" 뱃지 표시용
     * - 쿼리 1회로 해당 페이지의 모든 부모 댓글에 대해 일괄 판별
     */
    @Query("SELECT DISTINCT c.parent.id FROM Comment c " +
            "WHERE c.parent.id IN :parentIds AND c.status = 1 " +
            "AND c.userId IN (SELECT u.id FROM org.example.backend.user.entity.User u WHERE u.role = 'ARTIST' OR u.role = 'GROUP')")
    List<Long> findParentIdsWithArtistReply(@Param("parentIds") List<Long> parentIds);

    /**
     * 내가 쓴 댓글 조회 (정상 상태인 것만)
     */
    Slice<Comment> findAllByUserIdAndStatusOrderByIdDesc(Long userId, Integer status, Pageable pageable);
}