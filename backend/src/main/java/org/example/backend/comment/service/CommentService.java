package org.example.backend.comment.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.requset.CommentCreateRequest;
import org.example.backend.comment.dto.response.CommentResponse;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.enums.TargetType;
import org.example.backend.comment.exception.CommentErrorCode;
import org.example.backend.comment.exception.CommentException;
import org.example.backend.comment.repository.CommentRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;

    /**
     * 댓글 조회 (무한 스크롤)
     */
    public Slice<CommentResponse> getComments(TargetType targetType, Long targetId, Long lastId, Pageable pageable) {
        return commentRepository.findRootComments(targetType, targetId, lastId, pageable)
                .map(CommentResponse::from);
    }

    /**
     * 댓글 작성
     */
    @Transactional
    public Long create(CommentCreateRequest request, Long userId) {
        Comment parent = null;
        if (request.parentId() != null) {
            parent = commentRepository.findById(request.parentId())
                    .filter(p -> p.getStatus() == 1)
                    .orElseThrow(() -> new CommentException(CommentErrorCode.PARENT_COMMENT_NOT_FOUND));

            if (parent.getParent() != null) {
                throw new CommentException(CommentErrorCode.REPLY_NOT_ALLOWED);
            }
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


    //댓글 삭제 (Soft Delete)
    @Transactional
    public void delete(Long commentId, Long userId, boolean isAdmin) {
        // 관리자이거나 작성자 본인인 경우에만 댓글 객체를 반환받음
        Comment comment = getValidatedComment(commentId, userId, isAdmin);
        comment.delete();
    }

    // 댓글 수정
    @Transactional
    public void update(Long commentId, String content, Long userId) {
        // 수정은 관리자 권한을 허용하지 않으므로 isAdmin에 false 전달
        Comment comment = getValidatedComment(commentId, userId, false);
        comment.update(content);
    }



     //공통 검증 로직: 댓글 존재 확인 및 권한(작성자 or 관리자) 검증
    private Comment getValidatedComment(Long commentId, Long userId, boolean isAdmin) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));

        // 관리자가 아니고, 작성자 본인도 아니면 예외 발생
        if (!isAdmin && !comment.getUserId().equals(userId)) {
            throw new CommentException(CommentErrorCode.UNAUTHORIZED_ACCESS);
        }

        return comment;
    }
}