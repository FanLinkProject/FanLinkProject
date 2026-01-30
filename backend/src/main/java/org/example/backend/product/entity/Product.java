package org.example.backend.product.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Long price;

    @Column(nullable = false)
    private Integer stock;

    // 아티스트 엔티티 연동 전 Long FK로 보유
    @Column(name = "artist_id", nullable = false)
    private Long artistId;

    public Product(String name, Long price, Integer stock, Long artistId) {
        this.name = name;
        this.price = price;
        this.stock = stock;
        this.artistId = artistId;
    }
}