package org.example.backend.milestone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.milestone.entity.FanProfile;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FanProfileResponse {
    private Long id;
    private Long groupId;
    private String groupName;
    private int postCount;
    private int commentCount;
    private int visitCount;
    private int joinDays;
    private LocalDate lastVisitDate;
    private String gradeName;

    public static FanProfileResponse from(FanProfile fan) {
        String groupName = fan.getGroup() != null ? (fan.getGroup().getNickname() != null ? fan.getGroup().getNickname() : fan.getGroup().getEmail()) : "-";
        String gradeName = fan.getGrade() != null && fan.getGrade().getMilestone() != null
                ? fan.getGrade().getMilestone().getName() : null;
        return FanProfileResponse.builder()
                .id(fan.getId())
                .groupId(fan.getGroup() != null ? fan.getGroup().getId() : null)
                .groupName(groupName)
                .postCount(fan.getPostCount())
                .commentCount(fan.getCommentCount())
                .visitCount(fan.getVisitCount())
                .joinDays(fan.getJoinDays())
                .lastVisitDate(fan.getLastVisitDate())
                .gradeName(gradeName)
                .build();
    }
}
