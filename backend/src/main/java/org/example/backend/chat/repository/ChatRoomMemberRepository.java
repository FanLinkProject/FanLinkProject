package org.example.backend.chat.repository;


import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.entity.ChatRoomMember;
import org.example.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;


import java.util.List;
import java.util.Optional;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {


    @Query("""
    select distinct m.chatRoom
    from ChatRoomMember m
    where m.user.id = :userId
""")
    List<ChatRoom> findChatRoomsByUserId(Long userId);

	boolean existsByUserAndChatRoom(User user, ChatRoom chatRoom);

	Optional<ChatRoomMember> findByUserAndChatRoom(User user, ChatRoom chatRoom);
}
