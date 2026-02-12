package org.example.backend.post.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.post.dto.request.ArtistPostRequest;
import org.example.backend.post.dto.response.ArtistPostResponse;
import org.example.backend.post.entity.ArtistPost;
import org.example.backend.post.exception.PostErrorCode;
import org.example.backend.post.exception.PostException;
import org.example.backend.post.repository.ArtistPostRepository;
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
public class ArtistPostService {

    private final ArtistPostRepository artistPostRepository;
    private final UserRepository userRepository;

    @Transactional
    public ArtistPostResponse createPost(Long userId, ArtistPostRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new PostException(PostErrorCode.USER_NOT_FOUND));

        if (user.getRole() == UserRole.USER) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        User group = null;
        if (request.getGroupId() != null) {
            group = userRepository.findById(request.getGroupId())
                    .orElseThrow(() -> new PostException(PostErrorCode.GROUP_NOT_FOUND));
        }

        ArtistPost artistPost = ArtistPost.builder()
                .user(user)
                .group(group)
                .title(request.getTitle())
                .content(request.getContent())
                .isMembershipOnly(request.getIsMembershipOnly())
                .status(false)
                .build();

        ArtistPost savedPost = artistPostRepository.save(artistPost);
        return ArtistPostResponse.from(savedPost);
    }

    public ArtistPostResponse getPost(Long id) {
        ArtistPost artistPost = artistPostRepository.findById(id)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (artistPost.getStatus()) {
            throw new PostException(PostErrorCode.POST_NOT_FOUND);
        }

        return ArtistPostResponse.from(artistPost);
    }

    public List<ArtistPostResponse> getPosts(Long groupId, Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findPosts(groupId, lastPostId, pageable).stream()
                .map(ArtistPostResponse::from)
                .collect(Collectors.toList());
    }

    public List<ArtistPostResponse> getNotices(Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findNotices(lastPostId, pageable).stream()
                .map(ArtistPostResponse::from)
                .collect(Collectors.toList());
    }

    public List<ArtistPostResponse> getArtistPosts(Long groupId, Long lastPostId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return artistPostRepository.findArtistPosts(groupId, lastPostId, pageable).stream()
                .map(ArtistPostResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public ArtistPostResponse updatePost(Long userId, Long postId, ArtistPostRequest request) {
        ArtistPost artistPost = artistPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (!artistPost.getUser().getId().equals(userId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        artistPost.update(request.getTitle(), request.getContent(), request.getIsMembershipOnly());

        return ArtistPostResponse.from(artistPost);
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {
        ArtistPost artistPost = artistPostRepository.findById(postId)
                .orElseThrow(() -> new PostException(PostErrorCode.POST_NOT_FOUND));

        if (!artistPost.getUser().getId().equals(userId)) {
            throw new PostException(PostErrorCode.UNAUTHORIZED_ACCESS);
        }

        artistPost.delete();
    }
}
