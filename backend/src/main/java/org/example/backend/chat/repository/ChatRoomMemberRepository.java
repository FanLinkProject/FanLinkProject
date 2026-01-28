package org.example.backend.chat.repository;


import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.entity.ChatRoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;


import java.util.List;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {


    @Query("""
    select distinct m.chatRoom
    from ChatRoomMember m
    where m.user.id = :userId
""")
    List<ChatRoom> findChatRoomsByUserId(Long userId);

}
