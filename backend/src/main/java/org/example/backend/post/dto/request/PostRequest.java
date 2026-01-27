package org.example.backend.post.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

// PostRequest.java (생성/수정 요청)
@Getter
@NoArgsConstructor
public class PostRequest {
    private String title;
    private String content;
    private Long channelArtistId; // 어느 아티스트 채널에 쓸 것인지
    // 작성자 정보는 SecurityContext(로그인 정보)
    // 여기서는 Service 메서드 파라미터로 넘긴다고 가정
}