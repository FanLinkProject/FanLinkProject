package org.example.backend.settlement.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import java.math.BigDecimal;

@Getter
@RequiredArgsConstructor
public enum SettlementSourceType {
    // 상품/구독: 아티스트 90% (서비스 10%)
    PRODUCT("일반 상품", BigDecimal.valueOf(0.9)),
    SUBSCRIPTION("구독 멤버십", BigDecimal.valueOf(0.9)),

    // 캔디: 아티스트 20% (서비스 80%)
    CANDY("캔디", BigDecimal.valueOf(0.2));

    private final String description;
    private final BigDecimal defaultShareRatio; // 기본 정산 비율 (계산 로직 참조용)
}