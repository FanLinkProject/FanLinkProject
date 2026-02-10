package org.example.backend.milestone.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "member_grades")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MemberGrade {

    @Id
    @GeneratedValue
    private Long id;

    @OneToOne(optional = false)
    private FanProfile fan;

    @ManyToOne(optional = false)
    private Milestone milestone;

    private LocalDate assignedAt;

    public void updateMilestone(Milestone milestone) {
        this.milestone = milestone;
        this.assignedAt = LocalDate.now();
    }
}
