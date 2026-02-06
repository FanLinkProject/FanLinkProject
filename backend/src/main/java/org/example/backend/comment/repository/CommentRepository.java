package org.example.backend.comment.repository;

import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.enums.TargetType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * 내가 쓴 댓글 조회 (정상 상태인 것만)
     */
    Slice<Comment> findAllByUserIdAndStatusOrderByIdDesc(Long userId, Integer status, Pageable pageable);
}