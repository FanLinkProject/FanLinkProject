package org.example.backend.product.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.backend.product.enums.ProductPaymentMethod;
import org.example.backend.product.enums.ProductType;
import org.example.backend.product.exception.ProductErrorCode;
import org.example.backend.product.exception.ProductException;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "artist_id")
    private Long artistId; // Nullable: null이면 플랫폼 상품

    @Column(nullable = false)
    private String name;

    @Column
    private Long price; // 현금 결제 가격 (원 단위)

    @Column(name = "candy_price")
    private Long candyPrice; // Candy 결제 가격

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductPaymentMethod paymentMethod; // CASH_ONLY, CANDY_ONLY

    @Column(name = "is_subscription", nullable = false)
    private Boolean isSubscription;

    @Column(nullable = false)
    private Long quantity; // 재고 수량

    @Column(name = "is_membership_only", nullable = false, columnDefinition = "TINYINT(1) default 0")
    private Boolean isMembershipOnly; // 유료 팬 가입자만 구매할 수 있는 상품 여부 (0: false, 1: true)

    @Column(name = "is_exclusive", nullable = false, columnDefinition = "TINYINT(1) default 0")
    private Boolean isExclusive; // 팬링크 단독 상품 여부 (0: false, 1: true)

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Product(Long artistId, String name, Long price, Long candyPrice, ProductType type,
            ProductPaymentMethod paymentMethod, Boolean isSubscription, Long quantity,
            Boolean isMembershipOnly, Boolean isExclusive) {
        this.artistId = artistId;
        this.name = name;
        this.price = price;
        this.candyPrice = candyPrice;
        this.type = type;
        this.paymentMethod = paymentMethod;
        this.isSubscription = isSubscription != null ? isSubscription : false;
        this.quantity = quantity != null ? quantity : 0L;
        this.isMembershipOnly = isMembershipOnly != null ? isMembershipOnly : false;
        this.isExclusive = isExclusive != null ? isExclusive : false;

        validate();
    }

    private void validate() {
        if (type == null) {
            throw new ProductException(ProductErrorCode.INVALID_PRODUCT_TYPE);
        }

        // 1. 정산 대상 여부 검증
        if (type.isSettlementTarget() && artistId == null) {
            throw new ProductException(ProductErrorCode.SETTLEMENT_ARTIST_REQUIRED);
        }

        // 2. 결제 수단 검증
        if (paymentMethod != type.getPaymentMethod()) {
            throw new ProductException(ProductErrorCode.INVALID_PAYMENT_METHOD);
        }

        // 3. 가격 검증
        if (type.getPaymentMethod() == ProductPaymentMethod.CASH_ONLY) {
            if (price == null || price < 0) {
                throw new ProductException(ProductErrorCode.INVALID_PRICE);
            }
        } else if (type.getPaymentMethod() == ProductPaymentMethod.CANDY_ONLY) {
            if (candyPrice == null || candyPrice <= 0) {
                throw new ProductException(ProductErrorCode.INVALID_PRICE);
            }
        }
    }

    public void update(String name, Long price, Long candyPrice, ProductType type, ProductPaymentMethod paymentMethod,
            Boolean isSubscription, Long quantity, Boolean isMembershipOnly, Boolean isExclusive) {
        this.name = name;
        this.price = price;
        this.candyPrice = candyPrice;
        this.type = type;
        this.paymentMethod = paymentMethod;
        this.isSubscription = isSubscription != null ? isSubscription : false;
        this.quantity = quantity != null ? quantity : 0L;
        this.isMembershipOnly = isMembershipOnly != null ? isMembershipOnly : false;
        this.isExclusive = isExclusive != null ? isExclusive : false;

        validate();
    }

    public void increaseStock(Long quantity) {
        if (quantity < 0) {
            throw new ProductException(ProductErrorCode.INVALID_PRICE);
        }
        this.quantity += quantity;
    }

    public void decreaseStock(Long quantity) {
        if (quantity < 0) {
            throw new ProductException(ProductErrorCode.INVALID_PRICE);
        }

        if (this.quantity < quantity) {
            throw new ProductException(ProductErrorCode.OUT_OF_STOCK);
        }
        this.quantity -= quantity;
    }
}
