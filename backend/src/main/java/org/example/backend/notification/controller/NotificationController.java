package org.example.backend.notification.controller;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.dto.response.NotificationResponse;
import org.example.backend.notification.service.NotificationService;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    // SSE 구독
	@GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public ResponseEntity<SseEmitter> subscribe(PrincipalDetails principal) {
		SseEmitter emitter = notificationService.subscribe(principal.getUserId());
		return ResponseEntity.ok(emitter);
	}

    // 알림 테스트용(실제론 서비스에서 호출)
	@PostMapping("/send")
	public ResponseEntity<Void> sendNotification(
		@RequestBody @Valid NotificationSendRequest request
	) {
		notificationService.sendNotification(request);
		return ResponseEntity.status(HttpStatus.CREATED).build();
	}

    // 읽음 처리
	@PostMapping("/{id}/read")
	public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
		notificationService.markAsRead(id);
		return ResponseEntity.ok().build();
	}

    // 모두 읽음 처리
	@PostMapping("/read-all")
	public ResponseEntity<Void> markAllAsRead(PrincipalDetails principal) {
		notificationService.markAllAsRead(principal.getUserId());
		return ResponseEntity.ok().build();
	}

    // 읽지 않은 알람
	@GetMapping("/unread")
	public ResponseEntity<List<NotificationResponse>> getUnread(PrincipalDetails principal) {
		return ResponseEntity.ok(
			notificationService.getUnreadNotifications(principal.getUserId())
		);
	}

    // 모든 알람
	@GetMapping
	public ResponseEntity<List<NotificationResponse>> getAll(@AuthenticationPrincipal PrincipalDetails principal) {
		return ResponseEntity.ok(
			notificationService.getAllNotifications(principal.getUserId())
		);
	}
}
