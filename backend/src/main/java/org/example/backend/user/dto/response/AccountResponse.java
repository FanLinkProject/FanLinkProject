package org.example.backend.user.dto.response;

import org.example.backend.user.entity.Account;

// 계좌 정보 응답
public record AccountResponse(
        Long id,
        String bankName,
        String accountNumber,
        String holderName
) {
    public static AccountResponse from(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getBankName(),
                account.getAccountNumber(),
                account.getHolderName()
        );
    }
}
