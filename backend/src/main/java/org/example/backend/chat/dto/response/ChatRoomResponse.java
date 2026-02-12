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
    private Long hostId;
    private String hostName;
    /** 그룹 소속 아티스트인 경우 그룹명, 없으면 null */
    private String groupName;

    public static ChatRoomResponse of(ChatRoom chatRoom) {
        return new ChatRoomResponse(
            chatRoom.getId(),
            chatRoom.getOwner().getId(),
            chatRoom.getOwner().getName(),
            null
        );
    }

    public static ChatRoomResponse of(ChatRoom chatRoom, String groupName) {
        return new ChatRoomResponse(
            chatRoom.getId(),
            chatRoom.getOwner().getId(),
            chatRoom.getOwner().getName(),
            groupName
        );
    }
}
