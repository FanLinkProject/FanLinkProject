package org.example.backend.post.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class ArtistPostRequest {
    private Long groupId; // 자신의 그룹 ID
    private String title;
    private String content;
    private Boolean isMembershipOnly;
    /** 개인 아티스트 공지 여부 (토글로 설정) */
    private Boolean isNotice;
    private List<Long> mediaAssetIds;
    private Long representativeMediaAssetId;
}
