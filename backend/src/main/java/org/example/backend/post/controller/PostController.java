package org.example.backend.post.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.post.dto.request.PostCreateRequest;
import org.example.backend.post.dto.request.PostUpdateRequest;
import org.example.backend.post.dto.response.PostResponse;
import org.example.backend.post.service.PostService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // 게시글 생성
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Long createPost(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody @Valid PostCreateRequest request) {
        return postService.createPost(principal.getUser(), request);
    }

    // 게시글 단건 조회 (인증 불필요 가정)
    @GetMapping("/{id}")
    public PostResponse getPost(@PathVariable Long id) {
        return postService.getPost(id);
    }

    // 게시글 목록 조회
    @GetMapping
    public Page<PostResponse> getPostList(
            @RequestParam Long channelArtistId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return postService.getPostList(channelArtistId, pageable);
    }

    // 게시글 수정
    @PutMapping("/{id}")
    public void updatePost(
            @PathVariable Long id,
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody @Valid PostUpdateRequest request) {
        postService.updatePost(id, principal.getUser(), request);
    }

    // 게시글 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal PrincipalDetails principalDetails) {
        postService.deletePost(id, principalDetails.getUser());
    }
}