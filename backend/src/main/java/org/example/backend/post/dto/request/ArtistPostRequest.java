package org.example.backend.post.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ArtistPostRequest {
    private Long groupId; // 자신의 그룹 ID
    private String title;
    private String content;
    private Boolean isMembershipOnly;
}
