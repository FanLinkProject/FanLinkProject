package org.example.backend.post.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.post.dto.request.ArtistPostRequest;
import org.example.backend.post.dto.response.ArtistPostResponse;
import org.example.backend.post.dto.response.PostAccessResult;
import org.example.backend.post.service.ArtistPostService;
import org.example.backend.post.service.PostAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/artist-posts")
@RequiredArgsConstructor
public class ArtistPostController {

    private final ArtistPostService artistPostService;
    private final PostAccessService postAccessService;

    @PostMapping
    public ResponseEntity<ArtistPostResponse> createPost(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @RequestBody ArtistPostRequest request) {
        ArtistPostResponse response = artistPostService.createPost(principalDetails.getUserId(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ArtistPostResponse>> getPosts(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) Long lastPostId,
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal PrincipalDetails principalDetails) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        List<ArtistPostResponse> responses = artistPostService.getPosts(groupId, lastPostId, limit, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/notices")
    public ResponseEntity<List<ArtistPostResponse>> getNotices(
            @RequestParam(required = false) Long lastPostId,
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal PrincipalDetails principalDetails) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        List<ArtistPostResponse> responses = artistPostService.getNotices(lastPostId, limit, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/my")
    public ResponseEntity<List<ArtistPostResponse>> getMyPosts(
            @RequestParam(required = false) Long lastPostId,
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal PrincipalDetails principalDetails) {
        if (principalDetails == null) {
            return ResponseEntity.ok(List.of());
        }
        List<ArtistPostResponse> responses = artistPostService.getMyArtistPosts(
                principalDetails.getUserId(), lastPostId, limit);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/artist-only")
    public ResponseEntity<List<ArtistPostResponse>> getArtistPosts(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) Long lastPostId,
            @RequestParam(defaultValue = "10") int limit,
            @AuthenticationPrincipal PrincipalDetails principalDetails) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        List<ArtistPostResponse> responses = artistPostService.getArtistPosts(groupId, lastPostId, limit, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArtistPostResponse> getPost(
            @PathVariable Long id,
            @AuthenticationPrincipal PrincipalDetails principalDetails) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        ArtistPostResponse response = artistPostService.getPost(id, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/access")
    public ResponseEntity<?> issueAccessCookie(
            @PathVariable Long id,
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        Long userId = principalDetails != null ? principalDetails.getUserId() : null;
        PostAccessResult result = postAccessService.issueAccessCookie(id, userId,
                principalDetails != null ? principalDetails.getUser().getRole() : null);
        HttpHeaders headers = new HttpHeaders();
        for (String cookie : result.setCookieHeaders()) {
            headers.add(HttpHeaders.SET_COOKIE, cookie);
        }
        return ResponseEntity.ok().headers(headers).body(result.response());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ArtistPostResponse> updatePost(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long id,
            @RequestBody ArtistPostRequest request) {
        ArtistPostResponse response = artistPostService.updatePost(principalDetails.getUserId(), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @PathVariable Long id) {
        artistPostService.deletePost(principalDetails.getUserId(), id);
        return ResponseEntity.ok().build();
    }
}
