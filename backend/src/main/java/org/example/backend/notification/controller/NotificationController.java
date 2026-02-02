package org.example.backend.notification.controller;


import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.dto.response.NotificationResponse;
import org.example.backend.notification.service.NotificationService;

import org.example.backend.user.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    // SSE 구독
    @GetMapping("/subscribe")
    public SseEmitter subscribe(@AuthenticationPrincipal PrincipalDetails principal) {
        return notificationService.subscribe(principal.getUserId());
    }

    // 알림 테스트용(실제론 서비스에서 호출)
    @PostMapping("/send")
    public void sendTest(@RequestBody NotificationSendRequest request) {
        notificationService.sendNotification(request);
    }

    // 읽음 처리
    @PostMapping("/{id}/read")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
    }

    // 모두 읽음 처리
    @PostMapping("/read-all")
    public void markAllAsRead(@AuthenticationPrincipal PrincipalDetails principald) {
        notificationService.markAllAsRead(principald.getUserId());
    }

    // 읽지 않은 알람
    @GetMapping("/unread")
    public List<NotificationResponse> getUnread(@AuthenticationPrincipal PrincipalDetails principal) {
        return notificationService.getUnreadNotifications(principal.getUserId());
    }

    // 모든 알람
    @GetMapping
    public List<NotificationResponse> getAll(@AuthenticationPrincipal PrincipalDetails principal) {
        return notificationService.getAllNotifications(principal.getUserId());
    }
}
