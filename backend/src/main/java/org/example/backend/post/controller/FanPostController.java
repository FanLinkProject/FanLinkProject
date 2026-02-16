package org.example.backend.post.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.post.dto.request.FanPostRequest;
import org.example.backend.post.dto.response.FanPostResponse;
import org.example.backend.post.service.FanPostService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fan-posts")
@RequiredArgsConstructor
public class FanPostController {

    private final FanPostService fanPostService;

    @PostMapping
    public ResponseEntity<FanPostResponse> createPost(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @RequestBody FanPostRequest request) {
        FanPostResponse response = fanPostService.createPost(principalDetails.getUserId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<FanPostResponse>> getPosts(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) Long lastPostId,
            @RequestParam(defaultValue = "10") int limit) {
        List<FanPostResponse> responses = fanPostService.getPosts(groupId, lastPostId, limit);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FanPostResponse> getPost(@PathVariable Long id) {
        FanPostResponse response = fanPostService.getPost(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FanPostResponse> updatePost(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long id,
            @RequestBody FanPostRequest request) {
        FanPostResponse response = fanPostService.updatePost(principalDetails.getUserId(), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long id) {
        fanPostService.deletePost(principalDetails.getUserId(), id);
        return ResponseEntity.ok().build();
    }
}
