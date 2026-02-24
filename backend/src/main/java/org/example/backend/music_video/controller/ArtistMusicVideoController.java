package org.example.backend.music_video.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.music_video.dto.CreateMusicVideoRequest;
import org.example.backend.music_video.dto.MusicVideoResponse;
import org.example.backend.music_video.service.ArtistMusicVideoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/artists/{artistId}/music-videos")
@RequiredArgsConstructor
public class ArtistMusicVideoController {

    private final ArtistMusicVideoService artistMusicVideoService;

    // MV 등록 요청을 처리한다.
    @PostMapping
    public ResponseEntity<MusicVideoResponse> create(@PathVariable Long artistId,
                                                     @Valid @RequestBody CreateMusicVideoRequest request) {
        MusicVideoResponse response = artistMusicVideoService.create(artistId, request);
        return ResponseEntity.created(URI.create("/api/artists/" + artistId + "/music-videos/" + response.id()))
                .body(response);
    }

    // MV 목록 조회 요청을 처리한다. q 파라미터로 제목/설명 검색 가능.
    @GetMapping
    public ResponseEntity<List<MusicVideoResponse>> list(@PathVariable Long artistId,
                                                         @RequestParam(required = false) String q) {
        return ResponseEntity.ok(artistMusicVideoService.list(artistId, q));
    }

    // MV 상세 조회 요청을 처리한다.
    @GetMapping("/{id}")
    public ResponseEntity<MusicVideoResponse> getDetail(@PathVariable Long artistId,
                                                        @PathVariable Long id) {
        return ResponseEntity.ok(artistMusicVideoService.getDetail(artistId, id));
    }

    // MV 삭제 요청을 처리한다.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long artistId, @PathVariable Long id) {
        artistMusicVideoService.delete(artistId, id);
        return ResponseEntity.noContent().build();
    }
}
