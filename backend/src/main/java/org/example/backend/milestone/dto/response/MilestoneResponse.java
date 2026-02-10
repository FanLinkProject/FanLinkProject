package org.example.backend.milestone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.milestone.entity.Milestone;

import java.util.Collections;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MilestoneResponse {
    private Long id;
    private Long artistId;

    private String name;
    private String description;

    private Integer sortOrder;
    private boolean autoUpgrade;
    private boolean active;

    private List<MilestoneConditionResponse> conditions;

    public static MilestoneResponse from(Milestone milestone) {
        return MilestoneResponse.builder()
                .id(milestone.getId())
                .artistId(milestone.getArtist().getId())
                .name(milestone.getName())
                .description(milestone.getDescription())
                .sortOrder(milestone.getSortOrder())
                .autoUpgrade(milestone.isAutoUpgrade())
                .active(milestone.isActive())
                .conditions(
                        milestone.getConditions() == null
                                ? Collections.emptyList()
                                : milestone.getConditions().stream()
                                        .map(c -> new MilestoneConditionResponse(
                                                c.getType(),
                                                c.getRequiredValue()
                                        ))
                                        .toList()
                )
                .build();
    }

}
