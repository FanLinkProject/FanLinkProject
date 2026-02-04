package org.example.backend.chat.repository;


import org.example.backend.chat.entity.ChatRoom;
import org.example.backend.chat.entity.ChatRoomMember;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


import java.util.List;
import java.util.Optional;

public interface ChatRoomMemberRepository extends JpaRepository<ChatRoomMember, Long> {


    @Query("""
        select distinct r
        from ChatRoomMember m
        join m.chatRoom r
        join fetch r.owner
        where m.user.id = :userId
    """)
    List<ChatRoom> findChatRoomsByUserId(@Param("userId") Long userId);

	boolean existsByUserAndChatRoom(User user, ChatRoom chatRoom);

	Optional<ChatRoomMember> findByUserAndChatRoom(User user, ChatRoom chatRoom);

    @Query("SELECT m FROM ChatRoomMember m JOIN FETCH m.user WHERE m.chatRoom = :chatRoom AND m.user.role = :role")
    List<ChatRoomMember> findByChatRoomAndUserRole(@Param("chatRoom") ChatRoom chatRoom,
                                                   @Param("role") UserRole role);
}
