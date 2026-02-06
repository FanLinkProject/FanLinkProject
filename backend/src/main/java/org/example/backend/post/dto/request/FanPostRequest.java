package org.example.backend.post.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FanPostRequest {
    private Long groupId; // 글을 작성할 아티스트 그룹 ID
    private String title;
    private String content;
}
