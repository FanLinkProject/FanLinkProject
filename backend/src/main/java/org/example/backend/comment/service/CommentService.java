package org.example.backend.comment.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.comment.dto.request.CommentCreateRequest;
import org.example.backend.comment.dto.request.CommentUpdateRequest;
import org.example.backend.comment.dto.response.CommentResponse;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.exception.CommentErrorCode;
import org.example.backend.comment.exception.CommentException;
import org.example.backend.post.exception.PostErrorCode;
import org.example.backend.post.exception.PostException;
import org.example.backend.comment.repository.CommentRepository;
import org.example.backend.post.entity.Post;
import org.example.backend.post.enums.WriterType;
import org.example.backend.post.repository.PostRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
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
    public Long createComment(Long postId, User user, CommentCreateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        Comment parent = null;
        if (request.getParentId() != null) {
            parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new CommentException(CommentErrorCode.PARENT_COMMENT_NOT_FOUND));
        }

        // WriterType 변환
        WriterType writerType = resolveWriterType(user.getRole());

        Comment comment = Comment.builder()
                .post(post)
                .writerId(user.getId())
                .writerType(writerType)
                .content(request.getContent())
                .parent(parent)
                .build();

        return commentRepository.save(comment).getId();
    }

    // --- Read ---
    public List<CommentResponse> getComments(Long postId) {
        List<Comment> comments = commentRepository.findAllByPostId(postId);
        return comments.stream()
                .filter(comment -> comment.getParent() == null)
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private CommentResponse mapToDto(Comment comment) {
        CommentResponse dto = CommentResponse.from(comment);
        List<CommentResponse> childDtos = comment.getChildren().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
        dto.getChildren().addAll(childDtos);
        return dto;
    }

    // --- Update ---
    @Transactional
    public void updateComment(Long commentId, User user, CommentUpdateRequest request) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));

        validateWriter(comment, user);

        comment.updateContent(request.getContent());
    }

    // --- Delete ---
    @Transactional
    public void deleteComment(Long commentId, User user) { // 파라미터 변경
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CommentException(CommentErrorCode.COMMENT_NOT_FOUND));

        validateWriter(comment, user); // User 객체 전달
        comment.delete();
    }

    // --- 내부 편의 메서드 ---
    private WriterType resolveWriterType(UserRole role) {
        return (role == UserRole.ARTIST) ? WriterType.ARTIST : WriterType.USER;
    }

    private void validateWriter(Comment comment, User user) {
        WriterType currentType = resolveWriterType(user.getRole());

        if (!comment.getWriterId().equals(user.getId()) || comment.getWriterType() != currentType) {
            throw new CommentException(CommentErrorCode.NOT_COMMENT_WRITER);
        }
    }
}