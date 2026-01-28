package org.example.backend.chat.dto.response;

import lombok.*;
import org.example.backend.chat.entity.ChatRoom;

@Getter
@Builder
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomResponse {
    private Long roomId;
    private Long  hostId;
    private String hostName;

    public static ChatRoomResponse of(ChatRoom chatRoom) {
        return new ChatRoomResponse(chatRoom.getId(), chatRoom.getOwner().getId(), chatRoom.getOwner().getName());
    }
}
