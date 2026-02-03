package org.example.backend.chat.repository;
import java.util.Optional;

import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 채팅방 Repository
 * 
 * 역할:
 * - ChatRoom 엔티티의 기본 CRUD 제공
 * 
 * 주요 사용:
 * - ChatService에서 roomId로 ChatRoom 조회
 * - 아티스트당 1개 Room 제약은 엔티티의 @UniqueConstraint로 보장
 */
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long>{
	Optional<ChatRoom> findByOwner(User owner);
}
