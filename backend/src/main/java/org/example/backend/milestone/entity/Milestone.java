package org.example.backend.milestone.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.user.entity.User;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "milestones")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Milestone {

    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne(optional = false)
    private User artist;

    private String name;
    private String description;

    private Integer sortOrder;
    private boolean autoUpgrade;
    private boolean active;

    @OneToMany(mappedBy = "milestone", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MilestoneCondition> conditions = new ArrayList<>();

    public void updateInfo(String name, String description, Integer sortOrder, boolean autoUpgrade, boolean active) {
        this.name = name;
        this.description = description;
        this.sortOrder = sortOrder;
        this.autoUpgrade = autoUpgrade;
        this.active = active;
    }

    public void updateConditions(List<MilestoneCondition> newConditions) {
        this.conditions.clear();
        this.conditions.addAll(newConditions);
    }
}
