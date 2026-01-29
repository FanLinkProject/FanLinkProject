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
	public Long getCurrentUserId(@RequestBody Map<String, String> body) {
		String email = body.get("email");
		return chatDMService.getCurrentUserId(email);
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
	@GetMapping("/rooms/{roomId}/messages")
	public List<ChatMessageResponse> getMessages(
		@PathVariable Long roomId,
		@AuthenticationPrincipal PrincipalDetails principal,
		@RequestParam(required = false) Long cursor
	) {
		System.out.println("roomId=" + roomId + ", userId=" + principal.getUserId() + ", cursor=" + cursor);


		if (cursor == null) {
			List<ChatMessageResponse> result = chatDMService.getLatestMessagesByRole(roomId, principal.getUserId());
			System.out.println("result size=" + result.size());
			return result;
		} else {
			List<ChatMessageResponse> result = chatDMService.getMessagesBeforeByRole(roomId, principal.getUserId(), cursor);
			System.out.println("result size=" + result.size());
			return result;
		}
	}
}
