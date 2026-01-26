package org.example.backend.chat.repository;

import org.example.backend.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 채팅 메시지 Repository
 * 
 * 역할:
 * - ChatMessage 엔티티의 기본 CRUD 제공
 * 
 * 필터링 규칙 (팬 화면 조회 시):
 *   SELECT * FROM chat_messages
 *   WHERE room_id = ?
 *     AND (
 *       message_type = 'ARTIST'
 *       OR (message_type = 'FAN' AND sender_id = ?)
 *     )
 *   ORDER BY created_at ASC
 */
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
}