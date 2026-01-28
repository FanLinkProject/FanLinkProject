package org.example.backend.chat.controller;


import lombok.RequiredArgsConstructor;
import org.example.backend.chat.dto.request.ChatRoomRequest;
import org.example.backend.chat.dto.response.ChatMessageResponse;
import org.example.backend.chat.dto.response.ChatRoomResponse;
import org.example.backend.chat.service.ChatDMService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat/DM")
public class ChatDMController {
    private final ChatDMService chatDMService;

    // -----------------------------------
    // 1. 채팅방 생성
    // POST /api/chat/DM/rooms
    // -----------------------------------
    @PostMapping("/rooms")
    public ResponseEntity<ChatRoomResponse> createChatRoom(
            @RequestBody ChatRoomRequest chatRoomRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatDMService.createChatDMRoom(chatRoomRequest));
    }

    // -----------------------------------
    // 2. 채팅방 리스트 조회
    // GET /api/chat/DM/rooms?userId={userId}
    // -----------------------------------
    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomResponse>> getChatRoomList(@RequestParam Long userId) {
        List<ChatRoomResponse> responses = chatDMService.findChatDMRoomList(userId);
        return ResponseEntity.ok().body(responses);
    }

    // -----------------------------------
    // 3. 메시지 조회 (팬 / 아티스트 통합)
    // GET /api/chat/DM/rooms/{roomId}/messages?userId={userId}&cursor={cursorId}
    // 서비스에서 role 체크 후 반환
    // -----------------------------------
    /*@GetMapping("/rooms/{roomId}/messages")
    public List<ChatMessageResponse> getMessages(
            @PathVariable Long roomId,
            @RequestParam Long userId,
            @RequestParam(required = false) Long cursor
    ) {
        if (cursor == null) {
            return chatDMService.getLatestMessagesByRole(roomId, userId);
        } else {
            return chatDMService.getMessagesBeforeByRole(roomId, userId, cursor);
        }
    }*/

    @GetMapping("/rooms/{roomId}/messages")
    public List<ChatMessageResponse> getMessages(
            @PathVariable Long roomId,
            @RequestParam Long userId,
            @RequestParam(required = false) Long cursor
    ) {
        System.out.println("roomId=" + roomId + ", userId=" + userId + ", cursor=" + cursor);


        if (cursor == null) {
            List<ChatMessageResponse> result = chatDMService.getLatestMessagesByRole(roomId, userId);
            System.out.println("result size=" + result.size());
            return result;
        } else {
            List<ChatMessageResponse> result = chatDMService.getMessagesBeforeByRole(roomId, userId, cursor);
            System.out.println("result size=" + result.size());
            return result;
        }
    }

}
