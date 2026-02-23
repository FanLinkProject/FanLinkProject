package org.example.backend.chat.service;

import org.example.backend.chat.dto.response.ChatMessageResponse;
import org.example.backend.chat.dto.request.ChatMessageRequest;
import org.example.backend.chat.entity.ChatMessage;
import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.entity.ChatRoomMember;
import org.example.backend.chat.enums.MessageType;
import org.example.backend.chat.repository.ChatMessageRepository;
import org.example.backend.chat.repository.ChatRoomMemberRepository;
import org.example.backend.chat.repository.ChatRoomRepository;
import org.example.backend.notification.dto.request.NotificationSendRequest;
import org.example.backend.notification.entity.NotificationType;
import org.example.backend.notification.service.NotificationService;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import java.util.List;

/**
 * 채팅 서비스
 *
 * 책임:
 * - 채팅 메시지 처리(권한 타입 결정 → DB 저장 → Kafka 발행)
 *
 * 메시지 흐름:
 * 1) 발신자(User) 확인
 * 2) ChatRoom 조회
 * 3) 메시지 타입 결정(ARTIST/FAN)
 * 4) ChatMessage 저장
 * 5) ChatMessageEvent로 변환 후 Kafka 발행
 */
@Service
@RequiredArgsConstructor
public class ChatService {

	private final ChatMessageRepository chatMessageRepository;
	private final KafkaTemplate<String, ChatMessageResponse> kafkaTemplate;

	private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final NotificationService notificationService;

    /**
	 * 채팅 메시지 처리
	 */
    /** 팬 → 아티스트 */
    public void sendToArtist(User sender, ChatMessageRequest request) {
        // 1) 채팅방 조회
        ChatRoom room = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 없습니다. id=" + request.getRoomId()));

        // 2) 타입 = FAN (팬이 보낸 메시지)
        MessageType type = MessageType.FAN;

        // 3) 메시지 저장
        ChatMessage message = ChatMessage.of(room, sender, type, request.getContent());
        ChatMessage saved = chatMessageRepository.save(message);

        // 4) Kafka 발행 → artist-channel (아티스트만 받음)
        ChatMessageResponse response = ChatMessageResponse.from(saved);

        kafkaTemplate.send(
                "artist-channel",
                room.getId().toString(),
                response
        );;
    }

    /** 아티스트 → 팬 */
    @Transactional
    public void sendToFans(User sender,ChatMessageRequest request) {
        // 1) 채팅방 조회
        ChatRoom room = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("채팅방이 없습니다. id=" + request.getRoomId()));

        // 2) 아티스트 권한 체크
        if (!room.getOwner().getId().equals(sender.getId())) {
            throw new IllegalStateException("방의 아티스트만 팬들에게 메시지를 보낼 수 있습니다.");
        }

        // 3) 타입 = ARTIST
        MessageType type = MessageType.ARTIST;

        // 4) 메시지 저장
        ChatMessage message = ChatMessage.of(room, sender, type, request.getContent());
        ChatMessage saved = chatMessageRepository.save(message);

        // 5) Kafka 발행 → fan-channel (방 전체 팬들이 받음)
        ChatMessageResponse response = ChatMessageResponse.from(saved);

        kafkaTemplate.send(
                "fan-channel",
                room.getId().toString(),
                response
        );

        // 6) SSE 발행 → 팬들
        List<ChatRoomMember> fans = chatRoomMemberRepository.findByChatRoomAndUserRole(room, UserRole.USER);


        for (ChatRoomMember member : fans) {
            User fan = member.getUser();

            //Notification 생성 + DB 저장
            NotificationSendRequest notificationRequest = NotificationSendRequest.builder()
                    .senderId(sender.getId())
                    .receiverId(fan.getId())
                    .type(NotificationType.ARTIST_MESSAGE)
                    .content(sender.getNickname() + " 가 메세지를 남겼습니다")
                    .build();
            notificationService.sendNotification(notificationRequest); // DB 저장 + SSE 발송
        }
    }
}
