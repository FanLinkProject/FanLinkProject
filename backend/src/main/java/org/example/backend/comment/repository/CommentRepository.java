package org.example.backend.comment.repository;

import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.enums.TargetType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    // 특정 게시물의 최상위 댓글만 최신순으로 조회 (무한 스크롤)
    @Query("SELECT c FROM Comment c " +
            "WHERE c.targetType = :targetType AND c.targetId = :targetId " +
            "AND c.parent IS NULL " +
            "AND (:lastId IS NULL OR c.id < :lastId) " +
            "ORDER BY c.id DESC")
    Slice<Comment> findRootComments(TargetType targetType, Long targetId, Long lastId, Pageable pageable);

    // 내가 쓴 댓글 조회
    Slice<Comment> findAllByUserIdOrderByIdDesc(Long userId, Pageable pageable);
}