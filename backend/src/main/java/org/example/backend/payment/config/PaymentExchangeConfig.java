package org.example.backend.payment.config;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class PaymentExchangeConfig {

    // 캔디 환율: 100원 = 1캔디
    public static final int CANDY_EXCHANGE_RATE = 100;
}
