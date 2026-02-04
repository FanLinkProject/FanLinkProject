package org.example.backend.chat.service;


import lombok.RequiredArgsConstructor;
import org.example.backend.chat.dto.response.ChatMessageResponse;
import org.example.backend.chat.dto.response.ChatRoomResponse;
import org.example.backend.chat.entity.ChatMessage;
import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.entity.ChatRoomMember;
import org.example.backend.chat.enums.MessageType;
import org.example.backend.chat.exception.ChatException;
import org.example.backend.chat.exception.DMChatErrorCode;
import org.example.backend.chat.repository.ChatMessageRepository;
import org.example.backend.chat.repository.ChatRoomMemberRepository;
import org.example.backend.chat.repository.ChatRoomRepository;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ChatException(DMChatErrorCode.USER_NOT_FOUND))
                .getId();
	}

    //chatroom 생성
    @Transactional
    public ChatRoomResponse createChatDMRoom(Long artistId) {
        User user = userRepository.findById(artistId)
                .orElseThrow(() -> new ChatException(DMChatErrorCode.USER_NOT_FOUND));

        if (user.getRole() == UserRole.ARTIST) {
            throw new ChatException(DMChatErrorCode.HOST_CANNOT_BE_ARTIST);
        }

        ChatRoom chatRoom = ChatRoom.builder()
                .owner(user)
                .build();

        return ChatRoomResponse.of(chatRoomRepository.save(chatRoom));
    }


    //chatroom 리스트
    @Transactional(readOnly = true)
    public List<ChatRoomResponse> findChatDMRoomList(Long userId) {
        List<ChatRoom> chatRooms = chatRoomMemberRepository.findChatRoomsByUserId(userId);
        return chatRooms.stream().map(ChatRoomResponse::of).collect(Collectors.toList());
    }



    // 팬 메세지 화면
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getLatestMessagesByRole(Long roomId, Long userId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId) // hostId는 Long 타입
                .orElseThrow(() -> new ChatException(DMChatErrorCode.CHATROOM_NOT_FOUND));
        userRepository.findById(userId)
                .orElseThrow(() -> new ChatException(DMChatErrorCode.USER_NOT_FOUND));

        List<ChatMessage> messages;


        // 팬은 ARTIST + 나(FAN) 메시지
        messages = chatMessageRepository.findTop50ForFan(chatRoom, userId);


        Collections.reverse(messages); // 오래된 → 최신 순
        return messages.stream()
                .map(ChatMessageResponse::from)
                .toList();
    }


    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessagesBeforeByRole(Long roomId, Long userId, Long cursorId) {
        ChatRoom chatRoomBefore = chatRoomRepository.findById(roomId) // hostId는 Long 타입
                .orElseThrow(() -> new ChatException(DMChatErrorCode.CHATROOM_NOT_FOUND));
        userRepository.findById(userId)
                .orElseThrow(() -> new ChatException(DMChatErrorCode.USER_NOT_FOUND));

        List<ChatMessage> messages;

        messages = chatMessageRepository.findTop50ForFanBefore(chatRoomBefore, userId, cursorId);

        Collections.reverse(messages);
        return messages.stream()
                .map(ChatMessageResponse::from)
                .toList();
    }


    // 아티스트 화면
    @Transactional
    public List<Object> getLatestMessagesForArtist(Long roomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() ->new ChatException(DMChatErrorCode.CHATROOM_NOT_FOUND));
        List<ChatMessage> messages = chatMessageRepository.findTop50ByChatRoomOrderByIdDesc(chatRoom);
        Collections.reverse(messages);

        return groupFanMessages(messages);
    }

    /** 아티스트 화면 커서 이전 메시지 */
    @Transactional
    public List<Object> getMessagesBeforeForArtist(Long roomId, Long cursorId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ChatException(DMChatErrorCode.CHATROOM_NOT_FOUND));
        List<ChatMessage> messages = chatMessageRepository.findTop50ByChatRoomAndIdLessThanOrderByIdDesc(chatRoom, cursorId);
        Collections.reverse(messages);

        return groupFanMessages(messages);
    }

    /** 팬 메시지 묶기 로직 */
    private List<Object> groupFanMessages(List<ChatMessage> messages) {
        List<Object> result = new ArrayList<>();
        List<ChatMessageResponse> fanBuffer = new ArrayList<>();

        for (ChatMessage msg : messages) {
            if (msg.getMessageType() == MessageType.ARTIST) {
                if (!fanBuffer.isEmpty()) {
                    result.add(new ArrayList<>(fanBuffer));
                    fanBuffer.clear();
                }
                result.add(ChatMessageResponse.from(msg));
            } else {
                fanBuffer.add(ChatMessageResponse.from(msg));
            }
        }

        if (!fanBuffer.isEmpty()) {
            result.add(new ArrayList<>(fanBuffer));
        }

        return result;
    }

	@Transactional
	public void joinChatDMRoom(Long userId, Long artistId) {

		User user = userRepository.findById(userId)
			.orElseThrow(() -> new ChatException(DMChatErrorCode.USER_NOT_FOUND));

		User artist = userRepository.findById(artistId)
			.orElseThrow(() -> new ChatException(DMChatErrorCode.USER_NOT_FOUND));

		ChatRoom chatRoom = chatRoomRepository.findByOwner(artist)
			.orElseThrow(() -> new ChatException(DMChatErrorCode.CHAT_ROOM_NOT_FOUND));

		boolean exists = chatRoomMemberRepository.existsByUserAndChatRoom(user, chatRoom);
		if (exists) return;

		ChatRoomMember chatRoomMember = ChatRoomMember.builder()
			.user(user)
			.chatRoom(chatRoom)
			.build();

		chatRoomMemberRepository.save(chatRoomMember);
	}


	@Transactional
	public void exitChatDMRoom(Long userId, Long artistId) {

		User user = userRepository.findById(userId)
			.orElseThrow(() -> new ChatException(DMChatErrorCode.USER_NOT_FOUND));

		User artist = userRepository.findById(artistId)
			.orElseThrow(() -> new ChatException(DMChatErrorCode.USER_NOT_FOUND));

		ChatRoom chatRoom = chatRoomRepository.findByOwner(artist)
			.orElseThrow(() -> new ChatException(DMChatErrorCode.CHAT_ROOM_NOT_FOUND));

		ChatRoomMember member = chatRoomMemberRepository.findByUserAndChatRoom(user, chatRoom)
		        .orElseThrow(() -> new ChatException(DMChatErrorCode.CHAT_ROOM_MEMBER_NOT_FOUND));
		chatRoomMemberRepository.delete(member);
	}
}
