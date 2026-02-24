package org.example.backend.concert.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.concert.dto.request.ConcertCreateRequest;
import org.example.backend.concert.dto.request.ConcertUpdateRequest;
import org.example.backend.concert.dto.response.ConcertListItemResponse;
import org.example.backend.concert.dto.response.ConcertResponse;
import org.example.backend.concert.service.ConcertService;
import org.example.backend.global.security.details.PrincipalDetails;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/concerts")
public class ConcertController {

    private final ConcertService concertService;

    /**
     * 공연 생성
     */
    @PostMapping
    public ResponseEntity<ConcertResponse> createConcert(
            @AuthenticationPrincipal PrincipalDetails principal,
            @RequestBody @Valid ConcertCreateRequest request
    ) {
        ConcertResponse response = concertService.createConcert(principal.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 공연 조회 (단일)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ConcertResponse> getConcert(@PathVariable Long id) {
        ConcertResponse response = concertService.getConcert(id);
        return ResponseEntity.ok(response);
    }

    /**
     * 공연 목록 조회. includeEnded=true면 다가오는 공연 + 종료된 공연 모두 반환.
     */
    @GetMapping
    public ResponseEntity<List<ConcertListItemResponse>> getAllConcerts(
            @RequestParam(required = false, defaultValue = "false") Boolean includeEnded
    ) {
        List<ConcertListItemResponse> response = concertService.getAllConcerts(includeEnded);
        return ResponseEntity.ok(response);
    }

    /**
     * 지도 bounds 내 공연 목록 조회 (다가오는 공연만, 목록 DTO 동일)
     * 쿼리: swLat, swLng, neLat, neLng
     */
    @GetMapping("/in-bounds")
    public ResponseEntity<List<ConcertListItemResponse>> getConcertsInBounds(
            @RequestParam Double swLat,
            @RequestParam Double swLng,
            @RequestParam Double neLat,
            @RequestParam Double neLng
    ) {
        List<ConcertListItemResponse> response = concertService.getConcertsInBounds(swLat, swLng, neLat, neLng);
        return ResponseEntity.ok(response);
    }

    /**
     * 공연 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<ConcertResponse> updateConcert(
            @AuthenticationPrincipal PrincipalDetails principal,
            @PathVariable Long id,
            @RequestBody @Valid ConcertUpdateRequest request
    ) {
        ConcertResponse response = concertService.updateConcert(id, principal.getUserId(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * 공연 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConcert(@PathVariable Long id) {
        concertService.deleteConcert(id);
        return ResponseEntity.ok().build();
    }
}
