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
import org.springframework.scheduling.annotation.Scheduled;
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
        
        // 0L = 무한 타임아웃 (AsyncRequestTimeoutException 완화, 실제 종료는 onCompletion/onTimeout/onError로 처리)
        SseEmitter emitter = new SseEmitter(0L);
        emitterRepository.save(userId, emitter);

        // 연결 끊기면 제거 (스트림 내 예외가 GlobalExceptionHandler로 튀지 않도록 정리만 수행)
        emitter.onCompletion(() -> emitterRepository.delete(userId));
        emitter.onTimeout(() -> {
            emitterRepository.delete(userId);
            try { emitter.complete(); } catch (Exception ignored) { }
        });
        emitter.onError(e -> {
            emitterRepository.delete(userId);
            try { emitter.complete(); } catch (Exception ignored) { }
        });

        // event-stream 연결 확인용 더미 데이터 전송
        try {
            emitter.send(SseEmitter.event()
                    .name("connect")
                    .data("SSE 연결 완료"));
        } catch (IOException e) {
            emitterRepository.delete(userId);
            try { emitter.complete(); } catch (Exception ignored) { }
        }

        return emitter;
    }

    /**
     * 프록시/로드밸런서가 idle로 연결을 끊지 않도록 주기적으로 SSE 코멘트 전송.
     * (ERR_INCOMPLETE_CHUNKED_ENCODING 방지)
     */
    @Scheduled(fixedDelay = 20_000)
    public void sendHeartbeat() {
        for (Long userId : emitterRepository.getAllUserIds()) {
            SseEmitter emitter = emitterRepository.get(userId);
            if (emitter == null) continue;
            try {
                emitter.send(SseEmitter.event().comment(""));
            } catch (IOException e) {
                emitterRepository.delete(userId);
                try { emitter.complete(); } catch (Exception ignored) { }
            }
        }
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
                String jsonData = objectMapper.writeValueAsString(response);
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(jsonData));
            } catch (IOException e) {
                emitterRepository.delete(request.getReceiverId());
                try { emitter.complete(); } catch (Exception ignored) { }
            } catch (Exception e) {
                emitterRepository.delete(request.getReceiverId());
                try { emitter.complete(); } catch (Exception ignored) { }
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
