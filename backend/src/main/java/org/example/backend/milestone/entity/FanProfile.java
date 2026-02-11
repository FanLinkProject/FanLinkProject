package org.example.backend.milestone.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.backend.user.entity.User;

import java.time.LocalDate;

@Entity
@Table(name = "fanprofiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class FanProfile {

    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne(optional = false)
    private User fan;

    @ManyToOne(optional = false)
    private User artist;

    private int postCount;
    private int commentCount;
    private int visitCount;
    private int joinDays;

    @OneToOne(mappedBy = "fan", cascade = CascadeType.ALL, orphanRemoval = true)
    private MemberGrade grade;

    public void increasePostCount() { this.postCount++; }
    public void increaseCommentCount() { this.commentCount++; }

    public void decreasePostCount() { if (this.postCount > 0) this.postCount--; }
    public void decreaseCommentCount() { if (this.commentCount > 0) this.commentCount--; }
    public void increaseVisitCount() { this.visitCount++; }
    public void increaseJoinDays() { this.joinDays++; }

    // MemberGrade 생성 또는 기존 등급 업데이트 (detached entity 방지)
    public void updateGrade(Milestone milestone) {
        if (this.grade == null) {
            this.grade = MemberGrade.builder()
                    .fan(this)
                    .milestone(milestone)
                    .assignedAt(LocalDate.now())
                    .build();
        } else {
            this.grade.updateMilestone(milestone);
        }
    }

    // 조건 미충족 시 등급 제거 (등급 없음 처리)
    public void clearGrade() {
        this.grade = null;
    }

}

