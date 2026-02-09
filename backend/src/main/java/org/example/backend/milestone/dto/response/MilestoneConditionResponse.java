package org.example.backend.milestone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.milestone.entity.ConditionType;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MilestoneConditionResponse {
    private ConditionType type;
    private Integer requiredValue;
}
