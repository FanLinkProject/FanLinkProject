package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.PhoneNumberUpdateRequest;
import org.example.backend.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // 전화번호 수정
    @PutMapping("/phone")
    public ResponseEntity<Void> updatePhoneNumber(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody PhoneNumberUpdateRequest request
    ) {
        userService.updatePhoneNumber(principalDetails.getUser(), request);
        return ResponseEntity.noContent().build();
    }
}
