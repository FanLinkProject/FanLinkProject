package org.example.backend.chat.repository;

import org.example.backend.chat.dto.response.ChatMessageResponse;
import org.example.backend.chat.entity.ChatMessage;
import org.example.backend.chat.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 채팅 메시지 Repository
 *
 * 역할:
 * - ChatMessage 엔티티의 기본 CRUD 제공
 *
 * 필터링 규칙 (팬 화면 조회 시):
 * SELECT * FROM chat_messages
 * WHERE room_id = ?
 * AND (
 * message_type = 'ARTIST'
 * OR (message_type = 'FAN' AND sender_id = ?)
 * )
 * ORDER BY created_at ASC
 */

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    //Artist
    @Query("""
        select m
        from ChatMessage m
        where m.chatRoom = :chatRoom
        order by m.id desc
    """)
    List<ChatMessage> findTop50ByChatRoomOrderByIdDesc(ChatRoom chatRoom);

    @Query("""
        select m
        from ChatMessage m
        where m.chatRoom = :chatRoom
        and m.id < :cursorId
        order by m.id desc
    """)
    List<ChatMessage> findTop50ByChatRoomAndIdLessThanOrderByIdDesc(ChatRoom chatRoom, Long cursorId);

    //Fan
    @Query("""
        select m
        from ChatMessage m
        where m.chatRoom = :chatRoom
        and (m.messageType = 'ARTIST' or m.sender.id = :userId)
        order by m.id desc
    """)
    List<ChatMessage> findTop50ForFan(ChatRoom chatRoom, Long userId);

    @Query("""
        select m
        from ChatMessage m
        where m.chatRoom = :chatRoom
        and m.id < :cursorId
        and (m.messageType = 'ARTIST' or m.sender.id = :userId)
        order by m.id desc
    """)
    List<ChatMessage> findTop50ForFanBefore(@Param("chatRoom") ChatRoom chatRoom,
                                            @Param("userId") Long userId,
                                            @Param("cursorId") Long cursorId);

}