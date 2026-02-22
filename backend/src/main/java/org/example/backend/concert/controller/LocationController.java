package org.example.backend.concert.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.concert.dto.location.LocationResponse;
import org.example.backend.concert.dto.location.LocationUpsertRequest;
import org.example.backend.concert.service.LocationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/locations")
public class LocationController {

	private final LocationService locationService;

	/**
	 * 장소 Upsert: provider+placeId 기준으로 기존이 있으면 갱신, 없으면 생성. 응답 200 OK.
	 */
	@PostMapping
	public ResponseEntity<LocationResponse> upsert(@RequestBody @Valid LocationUpsertRequest request) {
		LocationResponse response = locationService.upsert(request);
		return ResponseEntity.ok(response);
	}
}
