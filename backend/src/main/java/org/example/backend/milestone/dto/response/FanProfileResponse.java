package org.example.backend.milestone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.milestone.entity.FanProfile;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FanProfileResponse {
    private Long id;
    private Long artistId;
    private String artistName;
    private int postCount;
    private int commentCount;
    private int visitCount;
    private int joinDays;
    private String gradeName;

    public static FanProfileResponse from(FanProfile fan) {
        String artistName = fan.getArtist() != null ? (fan.getArtist().getNickname() != null ? fan.getArtist().getNickname() : fan.getArtist().getEmail()) : "-";
        String gradeName = fan.getGrade() != null && fan.getGrade().getMilestone() != null
                ? fan.getGrade().getMilestone().getName() : null;
        return FanProfileResponse.builder()
                .id(fan.getId())
                .artistId(fan.getArtist() != null ? fan.getArtist().getId() : null)
                .artistName(artistName)
                .postCount(fan.getPostCount())
                .commentCount(fan.getCommentCount())
                .visitCount(fan.getVisitCount())
                .joinDays(fan.getJoinDays())
                .gradeName(gradeName)
                .build();
    }
}
