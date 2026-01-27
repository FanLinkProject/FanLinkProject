package org.example.backend.post.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.post.dto.request.PostRequest;
import org.example.backend.post.dto.response.PostResponse;
import org.example.backend.post.entity.Post;
import org.example.backend.post.enums.WriterType;
import org.example.backend.post.repository.PostRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 읽기 전용 (성능 최적화)
public class PostService {

    private final PostRepository postRepository;

    // --- Create ---
    @Transactional // 쓰기 허용
    public Long createPost(Long writerId, WriterType writerType, PostRequest request) {
        Post post = Post.builder()
                .channelArtistId(request.getChannelArtistId()) // 어느 아티스트 채널에?
                .writerId(writerId)
                .writerType(writerType)
                .title(request.getTitle())
                .content(request.getContent())
                .build();

        return postRepository.save(post).getId();
    }

    // --- Read (Single) ---
    public PostResponse getPost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다.")); // 추후 Custom Exception 권장
        return PostResponse.from(post);
    }

    // --- Read (List) ---
    public Page<PostResponse> getPostList(Long channelArtistId, Pageable pageable) {
        return postRepository.findAllByChannelArtistId(channelArtistId, pageable)
                .map(PostResponse::from);
    }

    // --- Update ---
    @Transactional
    public void updatePost(Long postId, Long currentUserId, WriterType currentUserType, PostRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        // 작성자 본인 확인
        validateWriter(post, currentUserId, currentUserType);

        // 객체 값만 바꾸면 트랜잭션 종료 시 자동 UPDATE 쿼리 발생
        post.update(request.getTitle(), request.getContent());
    }

    // --- Delete ---
    @Transactional
    public void deletePost(Long postId, Long currentUserId, WriterType currentUserType) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 게시글입니다."));

        validateWriter(post, currentUserId, currentUserType);

        // Soft Delete (Post 엔티티 내부 메서드 호출)
        post.delete();
    }

    // 작성자 검증 내부 메서드
    private void validateWriter(Post post, Long currentUserId, WriterType currentUserType) {
        if (!post.getWriterId().equals(currentUserId) || post.getWriterType() != currentUserType) {
            throw new IllegalStateException("작성자만 수정/삭제할 수 있습니다.");
        }
    }
}