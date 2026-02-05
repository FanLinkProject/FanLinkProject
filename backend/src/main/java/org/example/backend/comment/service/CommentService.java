package org.example.backend.comment.service;


import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.requset.CommentCreateRequest;
import org.example.backend.comment.dto.response.CommentResponse;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.enums.TargetType;
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

    @Transactional
    public Long create(CommentCreateRequest request, Long userId) {
        Comment parent = null;
        if (request.parentId() != null) {
            parent = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> new IllegalArgumentException("부모 댓글이 없습니다."));
            if (parent.getParent() != null) throw new IllegalStateException("대댓글에는 답글을 달 수 없습니다.");
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

    public Slice<CommentResponse> getComments(TargetType type, Long targetId, Long lastId, Pageable pageable) {
        return commentRepository.findRootComments(type, targetId, lastId, pageable)
                .map(CommentResponse::from);
    }
}
