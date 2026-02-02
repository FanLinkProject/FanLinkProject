package org.example.backend.chat.controller;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.example.backend.chat.dto.request.ChatRoomRequest;
import org.example.backend.chat.dto.response.ChatMessageResponse;
import org.example.backend.chat.dto.response.ChatRoomResponse;
import org.example.backend.chat.service.ChatDMService;
import org.example.backend.global.security.details.PrincipalDetails;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat/DM")
@Slf4j
public class ChatDMController {
	private final ChatDMService chatDMService;

	// -----------------------------------
	// 0. 프론트에서 userId 조회하기 위한 API
	// POST /api/chat/DM/userId
	// -----------------------------------
	@PostMapping("/userId")
	public  ResponseEntity<Long> getCurrentUserId(@RequestBody Map<String, String> body) {
		String email = body.get("email");
        Long userId = chatDMService.getCurrentUserId(email);
		return ResponseEntity.ok(userId);
	}

    // -----------------------------------
    // 0-1. 프론트에서 Role 조회
    // GET /api/chat/DM/role
    // -----------------------------------
    @GetMapping("/role")
    public ResponseEntity<Map<String, String>> getMyRole(@AuthenticationPrincipal PrincipalDetails principal) {
        String role = principal.getUser().getRole().name(); // FAN / ARTIST
        return ResponseEntity.ok(Map.of("role", role));
    }

    // -----------------------------------
    // 0-2. 프론트에서 닉네임 조회
    // GET /api/chat/DM/nickname
    // -----------------------------------
    @GetMapping("/nickname")
    public ResponseEntity<Map<String, String>> getMyNickname(@AuthenticationPrincipal PrincipalDetails principal) {
        String nickname = principal.getUser().getNickname(); // 엔티티에서 바로 닉네임
        return ResponseEntity.ok(Map.of("nickname", nickname));
    }

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
	public ResponseEntity<List<ChatRoomResponse>> getChatRoomList(@AuthenticationPrincipal PrincipalDetails principal) {
		log.info("senderId={}", principal.getUserId());
		List<ChatRoomResponse> responses = chatDMService.findChatDMRoomList(principal.getUserId());
		return ResponseEntity.ok().body(responses);
	}

	// -----------------------------------
	// 3. 메시지 조회 (팬 / 아티스트 통합)
	// GET /api/chat/DM/rooms/{roomId}/messages?userId={userId}&cursor={cursorId}
	// 서비스에서 role 체크 후 반환
	// -----------------------------------

    /**
     * 팬 화면 메시지 조회
     * - cursor 없으면 최신 50개
     * - cursor 있으면 과거 메시지 50개
     */
    @GetMapping("/fan/rooms/{roomId}/messages")
	public ResponseEntity<List<ChatMessageResponse>> getMessages(
		@PathVariable Long roomId,
		@AuthenticationPrincipal PrincipalDetails principal,
		@RequestParam(required = false) Long cursor
	) {
        List<ChatMessageResponse> result;
        if (cursor == null) {
            result = chatDMService.getLatestMessagesByRole(roomId, principal.getUserId());
        } else {
            result = chatDMService.getMessagesBeforeByRole(roomId, principal.getUserId(), cursor);
        }
        return ResponseEntity.ok(result);
	}


    /**
     * 아티스트 화면 메시지 조회
     * - cursor 없으면 최신 50개
     * - cursor 있으면 과거 메시지 50개
     */
    @GetMapping("/artist/rooms/{roomId}/messages")
    public ResponseEntity<List<Object>> getArtistMessages(
            @PathVariable Long roomId,
            @RequestParam(required = false) Long cursor
    ) {
        List<Object> result;
        if (cursor == null) {
            result = chatDMService.getLatestMessagesForArtist(roomId);
        } else {
            result = chatDMService.getMessagesBeforeForArtist(roomId, cursor);
        }
        return ResponseEntity.ok(result);
    }
}
