package org.example.backend.user.entity;
/*
처분당한 유저 id
처분 내린 관리자-추후 여러명 될 수도 있어서..
신고내용- 근거없이 차단할까봐..?
처분사유 - 관리자 기록(빼도 될것같은데..사이트규모가 커지면 공정성 때문에 있어야하지 않을까?)
패널티 종류(단일 패널티면 없어도 될것같은데..)
패널티 시작일/종료일

 */

import jakarta.persistence.*;
import org.example.backend.user.enums.PenaltyType;
import org.springframework.cglib.core.Local;

import java.time.LocalDateTime;

@Entity
public class Penalty {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "admin_id")
    private User admin;

    private String reason;

    @Enumerated(EnumType.STRING)
    private PenaltyType penaltyType;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;



}