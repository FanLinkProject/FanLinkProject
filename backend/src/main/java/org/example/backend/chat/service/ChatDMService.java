package org.example.backend.chat.service;


import lombok.RequiredArgsConstructor;
import org.example.backend.chat.dto.request.ChatRoomRequest;
import org.example.backend.chat.dto.response.ChatMessageResponse;
import org.example.backend.chat.dto.response.ChatRoomResponse;
import org.example.backend.chat.entity.ChatMessage;
import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.repository.ChatMessageRepository;
import org.example.backend.chat.repository.ChatRoomMemberRepository;
import org.example.backend.chat.repository.ChatRoomRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class ChatDMService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final ChatRoomMemberRepository chatRoomMemberRepository;

	@Transactional
	public Long getCurrentUserId(String email) {
		User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
		return user.getId();
	}

    //chatroom 생성
    @Transactional
    public ChatRoomResponse createChatDMRoom(ChatRoomRequest chatRoomRequest) {
        User user = userRepository.findById(chatRoomRequest.getHostId()) // hostId는 Long 타입
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() == UserRole.ARTIST) {
            throw new RuntimeException("호스트가 아닙니다"); // checked exception 아님
        }

        ChatRoom chatRoom = ChatRoom.builder()
                .owner(user)
                .build();

        return ChatRoomResponse.of(chatRoomRepository.save(chatRoom));
    }


    //chatroom 리스트
    public List<ChatRoomResponse> findChatDMRoomList(Long userId) {
        List<ChatRoom> chatRooms = chatRoomMemberRepository.findChatRoomsByUserId(userId);
        return chatRooms.stream().map(ChatRoomResponse::of).collect(Collectors.toList());
    }


    public List<ChatMessageResponse> getLatestMessagesByRole(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId) // hostId는 Long 타입
                .orElseThrow(() -> new RuntimeException("ChatRoom not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ChatMessage> messages;

        if (user.getRole() == UserRole.ARTIST) {
        // 아티스트는 모든 메시지
            messages = chatMessageRepository.findTop50ByChatRoomOrderByIdDesc(chatRoom);
        } else {
        // 팬은 ARTIST + 나(FAN) 메시지
            messages = chatMessageRepository.findTop50ForFan(chatRoom, userId);
        }

        Collections.reverse(messages); // 오래된 → 최신 순
        return messages.stream()
                .map(ChatMessageResponse::from)
                .toList();
    }


    public List<ChatMessageResponse> getMessagesBeforeByRole(Long roomId, Long userId, Long cursorId) {
        ChatRoom chatRoomBefore = chatRoomRepository.findById(roomId) // hostId는 Long 타입
                .orElseThrow(() -> new RuntimeException("ChatRoom not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ChatMessage> messages;

        if (user.getRole() == UserRole.ARTIST) {
            messages = chatMessageRepository.findTop50ByChatRoomAndIdLessThanOrderByIdDesc(chatRoomBefore, cursorId);
        } else {
            messages = chatMessageRepository.findTop50ForFanBefore(chatRoomBefore, userId, cursorId);
        }

        Collections.reverse(messages);
        return messages.stream()
                .map(ChatMessageResponse::from)
                .toList();
    }
}
