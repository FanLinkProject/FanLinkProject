package org.example.backend.comment.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.request.CommentRequest;
import org.example.backend.comment.dto.response.CommentResponse;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.repository.CommentRepository;
import org.example.backend.post.entity.Post;
import org.example.backend.post.enums.WriterType;
import org.example.backend.post.repository.PostRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;

    // --- Create ---
    @Transactional
    public Long createComment(Long postId, Long writerId, WriterType writerType, CommentRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        Comment parent = null;
        // 대댓글인 경우 부모 확인
        if (request.getParentId() != null) {
            parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new IllegalArgumentException("부모 댓글이 존재하지 않습니다."));
        }

        Comment comment = Comment.builder()
                .post(post)
                .writerId(writerId)
                .writerType(writerType)
                .content(request.getContent())
                .parent(parent) // 대댓글이면 parent 들어감, 아니면 null
                .build();

        return commentRepository.save(comment).getId();
    }

    // --- Read (계층형 구조 변환) ---
    public List<CommentResponse> getComments(Long postId) {
        // 1. 해당 게시글의 모든 댓글 조회 (QueryDSL 등을 쓰면 더 최적화 가능)
        List<Comment> comments = commentRepository.findAllByPostId(postId);

        // 2. Entity -> DTO 변환 및 계층 구조 조립
        // 부모가 없는 최상위 댓글만 필터링 후 DTO 변환
        return comments.stream()
                .filter(comment -> comment.getParent() == null)
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // 재귀적으로 자식 댓글 매핑
    private CommentResponse mapToDto(Comment comment) {
        CommentResponse dto = CommentResponse.from(comment);

        // 자식 댓글들이 있다면 재귀 호출하여 DTO 리스트에 추가
        List<CommentResponse> childDtos = comment.getChildren().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        dto.getChildren().addAll(childDtos);
        return dto;
    }

    // --- Update (Soft Delete된 댓글은 수정 불가 처리 등 정책 필요) ---
    @Transactional
    public void updateComment(Long commentId, Long currentUserId, WriterType currentUserType, String content) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다."));

        if (comment.isDeleted()) {
            throw new IllegalStateException("삭제된 댓글은 수정할 수 없습니다.");
        }

        validateWriter(comment, currentUserId, currentUserType);
        comment.updateContent(content);
    }

    // --- Delete (Soft Delete) ---
    @Transactional
    public void deleteComment(Long commentId, Long currentUserId, WriterType currentUserType) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 댓글입니다."));

        validateWriter(comment, currentUserId, currentUserType);

        // Soft Delete (화면엔 '삭제된 댓글입니다' 표시)
        comment.delete();
    }

    private void validateWriter(Comment comment, Long currentUserId, WriterType currentUserType) {
        if (!comment.getWriterId().equals(currentUserId) || comment.getWriterType() != currentUserType) {
            throw new IllegalStateException("작성자만 권한이 있습니다.");
        }
    }
}