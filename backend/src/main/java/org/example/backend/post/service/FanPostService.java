package org.example.backend.post.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.post.dto.request.FanPostRequest;
import org.example.backend.post.dto.response.FanPostResponse;
import org.example.backend.post.entity.FanPost;
import org.example.backend.post.exception.PostErrorCode;
import org.example.backend.post.exception.PostException;
import org.example.backend.post.repository.FanPostRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.example.backend.user.enums.UserRole;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FanPostService {

    private final FanPostRepository fanPostRepository;
    private final UserRepository userRepository;

    @Transactional
    public FanPostResponse createPost(Long userId, FanPostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new PostException(PostErrorCode.USER_NOT_FOUND));

        if (user.getRole() != UserRole.USER) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        User group = null;
        if (request.getGroupId() != null) {
            group = userRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new PostException(PostErrorCode.GROUP_NOT_FOUND));
        }

        FanPost fanPost = FanPost.builder()
                .user(user)
                .group(group)
                .title(request.getTitle())
                .content(request.getContent())
                .status(false)
                .build();

        FanPost savedPost = fanPostRepository.save(fanPost);
        return FanPostResponse.from(savedPost);
    }

    public FanPostResponse getPost(Long id) {
        FanPost fanPost = fanPostRepository.findById(id)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (fanPost.getStatus()) { // 삭제된 게시글
            throw new PostException(PostErrorCode.POST_NOT_FOUND);
        }

        return FanPostResponse.from(fanPost);
    }

    public List<FanPostResponse> getPosts(Long groupId, Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return fanPostRepository.findPosts(groupId, lastPostId, pageable).stream()
                .map(FanPostResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public FanPostResponse updatePost(Long userId, Long postId, FanPostRequest request) {
        FanPost fanPost = fanPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (!fanPost.getUser().getId().equals(userId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        fanPost.update(request.getTitle(), request.getContent());

        return FanPostResponse.from(fanPost);
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {
        FanPost fanPost = fanPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (!fanPost.getUser().getId().equals(userId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        fanPost.delete();
    }
}
