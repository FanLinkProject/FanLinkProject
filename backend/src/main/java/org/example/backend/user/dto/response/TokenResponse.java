package org.example.backend.user.dto.response;

import lombok.Builder;
//캡슐화 작업 및 액세스토큰만 현재 작업중이라 후에 리팩토링필요

@Builder
public record TokenResponse(
    String grantType,// Bearer 설정
    String accessToken,
    Long accessTokenExpiresIn
    ) {
}

