package org.example.backend.candy.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "candies")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Candy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 변동 수량 (양수: 충전, 음수: 사용)
    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CandyType type;

    // 결제 연동 시 NOT NULL, 이벤트 지급/단순 사용 시 null
    @Column(name = "payment_id", nullable = true)
    private Long paymentId;

    public Candy(Long userId, Long amount, CandyType type, Long paymentId) {
        this.userId = userId;
        this.amount = amount;
        this.type = type;
        this.paymentId = paymentId;
    }

    // 결제 없이 캔디 사용 로그 생성 시 사용 (paymentId=null, amount는 음수로 저장)
    public static Candy createUsageLog(Long userId, Long amount) {
        return new Candy(userId, -Math.abs(amount), CandyType.USE, null);
    }
}