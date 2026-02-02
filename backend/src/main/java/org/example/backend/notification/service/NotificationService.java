package org.example.backend.notification.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.notification.config.EmitterRepository;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.dto.response.NotificationResponse;
import org.example.backend.notification.entity.Notification;
import org.example.backend.notification.exception.NotificationErrorCode;
import org.example.backend.notification.exception.NotificationException;
import org.example.backend.notification.repository.NotificationRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

    private final EmitterRepository emitterRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(60L * 1000 * 60); // 1시간
        emitterRepository.save(userId, emitter);

        // 연결 끊기면 제거
        emitter.onCompletion(() -> emitterRepository.delete(userId));
        emitter.onTimeout(() -> emitterRepository.delete(userId));

        // event-stream 연결 확인용 더미 데이터 전송
        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("SSE 연결 완료"));
        } catch (IOException e) {
            emitterRepository.delete(userId);
        }

        return emitter;
    }

    // 알림 생성 + SSE 푸시
    public void sendNotification(NotificationSendRequest request) {
        User receiver = userRepository.findById(request.getReceiverId())
			.orElseThrow(() -> new NotificationException(NotificationErrorCode.RECEIVER_NOT_FOUND));
        User sender = userRepository.findById(request.getSenderId())
			.orElseThrow(() -> new NotificationException(NotificationErrorCode.SENDER_NOT_FOUND));

        Notification notification = Notification.builder()
                .receiver(receiver)
                .sender(sender)
                .type(request.getType())
                .content(request.getContent())
                .build();

        notificationRepository.save(notification);

        SseEmitter emitter = emitterRepository.get(receiver.getId());
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(notification));
            } catch (IOException e) {
                emitterRepository.delete(receiver.getId());
            }
        }
    }




    // 단일 읽음 처리
    public void markAsRead(Long notificationId) {
        Notification noti = notificationRepository.findById(notificationId)
			.orElseThrow(() -> new NotificationException(NotificationErrorCode.NOTIFICATION_NOT_FOUND));
        noti.markAsRead();  // 엔티티에 markAsRead() 메서드 있어야 함
    }

    // 전체 읽음 처리
    public void markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByReceiverIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        notifications.forEach(Notification::markAsRead);
    }

    // 읽지 않은 알림 목록 조회
	@Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findByReceiverIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(n -> new NotificationResponse(n.getContent(), n.getCreatedAt()))
                .collect(Collectors.toList());
    }

    // 전체 알림 목록 조회
	@Transactional(readOnly = true)
	public List<NotificationResponse> getAllNotifications(Long userId) {
        return notificationRepository.findByReceiverIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(n -> new NotificationResponse(n.getContent(), n.getCreatedAt()))
                .collect(Collectors.toList());
    }
}
