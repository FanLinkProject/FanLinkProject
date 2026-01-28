package org.example.backend.chat.repository;

import java.util.List;

import org.example.backend.chat.entity.ChatRoomMember;
import org.example.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {
	ChatRoomMember findByUser(User user);
	List<ChatRoomMember> findAllByUser(User user);
}
