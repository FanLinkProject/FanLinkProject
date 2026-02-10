package org.example.backend.user.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.user.dto.response.GuestHomeResponse;
import org.example.backend.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/guest")
@RequiredArgsConstructor
public class GuestHomeController {

    private final UserService userService;

    // 비로그인 유저 메인 홈 화면
    @GetMapping("/home")
    public ResponseEntity<GuestHomeResponse> getGuestHome() {
        GuestHomeResponse response = userService.getGuestHome();
        return ResponseEntity.ok(response);
    }
}
