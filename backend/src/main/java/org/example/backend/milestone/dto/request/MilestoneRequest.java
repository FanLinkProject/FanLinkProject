package org.example.backend.milestone.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MilestoneRequest {
    private Long groupId;
    private String name;
    private String description;
    private Integer sortOrder;
    private boolean autoUpgrade;
    private boolean active;
    private List<MilestoneConditionRequest> conditions;
}
