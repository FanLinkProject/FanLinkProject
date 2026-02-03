package org.example.backend.product.enums;

public enum ProductType {
    SETTLEMENT_CASH(true, ProductPaymentMethod.CASH_ONLY),
    SETTLEMENT_CANDY(true, ProductPaymentMethod.CANDY_ONLY),
    CASH(false, ProductPaymentMethod.CASH_ONLY),
    CANDY(false, ProductPaymentMethod.CANDY_ONLY);

    private final boolean isSettlementTarget;
    private final ProductPaymentMethod paymentMethod;

    ProductType(boolean isSettlementTarget, ProductPaymentMethod paymentMethod) {
        this.isSettlementTarget = isSettlementTarget;
        this.paymentMethod = paymentMethod;
    }

    public boolean isSettlementTarget() {
        return isSettlementTarget;
    }

    public ProductPaymentMethod getPaymentMethod() {
        return paymentMethod;
    }
}
