package org.example.backend.user.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.response.ArtistHomeResponse;
import org.example.backend.user.dto.response.GuestHomeResponse;
import org.example.backend.user.dto.response.UserHomeResponse;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.service.ArtistService;
import org.example.backend.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HomeController {

    private final UserService userService;
    private final ArtistService artistService;

    // userRole에 따른 홈 화면 차별화
    @GetMapping("/home")
    public ResponseEntity<Object> getHome(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        // 비로그인 유저
        if (principalDetails == null) {
            GuestHomeResponse response = userService.getGuestHome();
            return ResponseEntity.ok(response);
        }

        User user = principalDetails.getUser();
        UserRole role = user.getRole();

        // 아티스트 또는 그룹
        if (role == UserRole.ARTIST || role == UserRole.GROUP) {
            ArtistHomeResponse response = artistService.getArtistHome(user);
            return ResponseEntity.ok(response);
        }

        // 일반 유저 (USER, ADMIN 등)
        UserHomeResponse response = userService.getUserHome(user);
        return ResponseEntity.ok(response);
    }
}
