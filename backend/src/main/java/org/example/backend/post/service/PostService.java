package org.example.backend.post.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.comment.entity.Comment;
import org.example.backend.comment.repository.CommentRepository;
import org.example.backend.post.dto.request.PostCreateRequest;
import org.example.backend.post.dto.request.PostUpdateRequest;
import org.example.backend.post.dto.response.PostResponse;
import org.example.backend.post.entity.Post;
import org.example.backend.post.enums.WriterType;
import org.example.backend.post.exception.PostErrorCode;
import org.example.backend.post.exception.PostException;
import org.example.backend.post.repository.PostRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    // --- Create ---
    @Transactional
    public Long createPost(User user, PostCreateRequest request) {

        // WriterType 결정 로직 (서비스 내부로 이동)
        WriterType writerType = resolveWriterType(user.getRole());

        Post post = Post.builder()
                .channelArtistId(request.getChannelArtistId())
                .writerId(user.getId())
                .writerType(writerType)      // 결정된 Type 사용
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return postRepository.save(post).getId();
    }

    // --- Read (Single) ---
    public PostResponse getPost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));
        return PostResponse.from(post);
    }

    // --- Read (List) ---
    public Page<PostResponse> getPostList(Long channelArtistId, Pageable pageable) {
        return postRepository.findAllByChannelArtistId(channelArtistId, pageable)
                .map(PostResponse::from);
    }

    // --- Update ---
    @Transactional
    public void updatePost(Long postId, User user, PostUpdateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        validateWriter(post, user);

        post.update(request.getTitle(), request.getContent());
    }

    // --- Delete ---
    @Transactional
    public void deletePost(Long postId, User user) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        validateWriter(post, user);

        List<Comment> comments = commentRepository.findAllByPostId(postId);
        comments.forEach(Comment::delete);

        post.delete();
    }

    // --- 내부 편의 메서드 ---

    // 1. UserRole -> WriterType 변환
    private WriterType resolveWriterType(UserRole role) {
        return (role == UserRole.ARTIST) ? WriterType.ARTIST : WriterType.USER;
    }

    // 2. 작성자 검증
    private void validateWriter(Post post, User user) {
        WriterType currentType = resolveWriterType(user.getRole());

        if (!post.getWriterId().equals(user.getId()) || post.getWriterType() != currentType) {
            throw new PostException(PostErrorCode.NOT_POST_WRITER);
        }
    }
}