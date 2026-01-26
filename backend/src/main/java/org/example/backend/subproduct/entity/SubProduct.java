package org.example.backend.subproduct.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "sub_products")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Long price;

    @Column(name = "duration_days", nullable = false)
    private Integer durationDays;

    public SubProduct(String name, Long price, Integer durationDays) {
        this.name = name;
        this.price = price;
        this.durationDays = durationDays;
    }

    // 30일 구독 상품 생성 시 사용
    public static SubProduct createMonthlySubscription(String name, Long price) {
        return new SubProduct(name, price, 30);
    }
}