package org.example.backend.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.example.backend.notification.repository.EmitterRepository;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.dto.response.NotificationResponse;
import org.example.backend.notification.entity.Notification;
import org.example.backend.notification.exception.NotificationErrorCode;
import org.example.backend.notification.exception.NotificationException;
import org.example.backend.notification.repository.NotificationRepository;
import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.repository.ChatRoomRepository;
import org.example.backend.notification.entity.NotificationType;
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
public class NotificationService {

    private final EmitterRepository emitterRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ObjectMapper objectMapper;

    public SseEmitter subscribe(Long userId) {
        // 기존 emitter가 있으면 제거 (중복 구독 방지)
        SseEmitter existingEmitter = emitterRepository.get(userId);
        if (existingEmitter != null) {
            try {
                existingEmitter.complete();
            } catch (Exception e) {
                // 무시
            }
            emitterRepository.delete(userId);
        }
        
        SseEmitter emitter = new SseEmitter(5L * 60 * 1000); // 5분
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
    @Transactional
    public void sendNotification(NotificationSendRequest request) {
        
        User receiver = userRepository.getReferenceById(request.getReceiverId());
        User sender = userRepository.getReferenceById(request.getSenderId());

        Notification notification = Notification.builder()
                .receiver(receiver)
                .sender(sender)
                .type(request.getType())
                .content(request.getContent())
                .build();

        notificationRepository.save(notification);
        // flush를 명시적으로 호출하여 ID가 생성되도록 보장
        notificationRepository.flush();

        // SSE 전송 (트랜잭션 내에서 실행되지만 flush 후이므로 안전)
        SseEmitter emitter = emitterRepository.get(request.getReceiverId());
        if (emitter != null) {
            try {
                NotificationResponse response = toResponse(notification);
                // ObjectMapper를 사용하여 JSON 문자열로 명시적 변환
                String jsonData = objectMapper.writeValueAsString(response);
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(jsonData));
            } catch (Exception e) {
                emitterRepository.delete(request.getReceiverId());
            }
        }
    }




    // 단일 읽음 처리
    @Transactional
    public void markAsRead(Long notificationId) {
        int updated = notificationRepository.markAsRead(notificationId);
        if (updated == 0) {
            throw new NotificationException(NotificationErrorCode.NOTIFICATION_NOT_FOUND);
        }
    }

    // 전체 읽음 처리
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    // 읽지 않은 알림 목록 조회
	@Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findByReceiver_IdAndIsReadFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // 전체 알림 목록 조회
	@Transactional(readOnly = true)
	public List<NotificationResponse> getAllNotifications(Long userId) {
        return notificationRepository.findByReceiver_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private NotificationResponse toResponse(Notification n) {
        Long roomId = null;
        if ((n.getType() == NotificationType.ARTIST_MESSAGE || n.getType() == NotificationType.FAN_MESSAGE)
                && n.getSender() != null) {
            roomId = chatRoomRepository.findByOwner(n.getSender())
                    .map(ChatRoom::getId)
                    .orElse(null);
        }
        return NotificationResponse.from(n, roomId);
    }

    @Transactional
    public void deleteReadNotifications(Long userId) {
        notificationRepository.deleteReadByUserId(userId);
    }
}
