package org.example.backend.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.example.backend.user.enums.ReportCategory;
import org.example.backend.user.enums.ReportType;

//신고 내용에 관한 엔티티
@Entity
@Getter
@Setter
@Table(name = "reports")
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 신고 한 유저
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_user_id", nullable = false)
    private User reporter;

    // 신고 당한 유저
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reported;

    // 신고 종류
    @Column(name = "category", nullable = false)
    @Enumerated(EnumType.STRING)
    private ReportCategory category;

    // 신고 상세 사유
    @Column(name = "reason_detail", nullable = false)
    private String reasonDetail;

    // 신고 유형 - TODO : 유저(userId), 게시글(postId) 받아와야함
    @Column(name = "type", nullable = false)
    @Enumerated(EnumType.STRING)
    private ReportType type;

    //신고 패널티 결과
    @Column(name = "status", nullable = false)
    private boolean status;

}
