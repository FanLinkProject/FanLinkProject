package org.example.backend.milestone.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "milestone_conditions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MilestoneCondition {

    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne(optional = false)
    private Milestone milestone;

    @Enumerated(EnumType.STRING)
    private ConditionType type; // POST_COUNT, COMMENT_COUNT, VISIT_COUNT

    private int requiredValue;

    public boolean isSatisfiedBy(FanProfile fan) {
        return switch (type) {
            case POST_COUNT -> fan.getPostCount() >= requiredValue;
            case COMMENT_COUNT -> fan.getCommentCount() >= requiredValue;
            case VISIT_COUNT -> fan.getVisitCount() >= requiredValue;
            case JOIN_DAYS -> fan.getJoinDays() >= requiredValue; // ← 예시
        };
    }
}
