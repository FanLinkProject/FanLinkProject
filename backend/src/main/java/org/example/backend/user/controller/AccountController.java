package org.example.backend.user.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.dto.request.AccountRequest;
import org.example.backend.user.dto.response.AccountResponse;
import org.example.backend.user.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 계좌 정보 컨트롤러
 * 
 * <p>현재 로그인한 사용자의 계좌 정보를 관리합니다.</p>
 */
@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    // 계좌 등록
    @PostMapping
    public ResponseEntity<AccountResponse> createAccount(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody AccountRequest request
    ) {
        AccountResponse response = accountService.createAccount(principalDetails.getUser(), request);
        return ResponseEntity.ok(response);
    }

    // 계좌 조회
    @GetMapping
    public ResponseEntity<AccountResponse> getAccount(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        AccountResponse response = accountService.getAccount(principalDetails.getUser());
        return ResponseEntity.ok(response);
    }


    // 계좌 정보 수정
    @PutMapping
    public ResponseEntity<AccountResponse> updateAccount(
            @AuthenticationPrincipal PrincipalDetails principalDetails,
            @Valid @RequestBody AccountRequest request
    ) {
        AccountResponse response = accountService.updateAccount(principalDetails.getUser(), request);
        return ResponseEntity.ok(response);
    }

    // 계좌 삭제
    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(
            @AuthenticationPrincipal PrincipalDetails principalDetails
    ) {
        accountService.deleteAccount(principalDetails.getUser());
        return ResponseEntity.noContent().build();
    }
}
