package org.example.backend.comment.repository;

import org.example.backend.comment.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 특정 게시글의 모든 댓글 조회 (최적화를 위해 부모 댓글만 가져오고 자식은 Fetch Join 할 수도 있음)
    // 여기서는 간단하게 게시글 ID로 전체 조회 후 메모리에서 계층 정렬
    @Query("SELECT c FROM Comment c WHERE c.post.id = :postId ORDER BY c.createdAt ASC")
    List<Comment> findAllByPostId(@Param("postId") Long postId);
}