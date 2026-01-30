package org.example.backend.user.service;

import lombok.RequiredArgsConstructor;
import org.example.backend.global.exception.BusinessException;
import org.example.backend.user.dto.request.AccountRequest;
import org.example.backend.user.dto.response.AccountResponse;
import org.example.backend.user.entity.Account;
import org.example.backend.user.entity.User;
import org.example.backend.user.exception.UserErrorCode;
import org.example.backend.user.repository.AccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AccountService {

    private final AccountRepository accountRepository;

    // 계좌 등록
    public AccountResponse createAccount(User user, AccountRequest request) {
        // 이미 계좌가 등록되어 있는지 확인
        if (accountRepository.existsByUserId(user.getId())) {
            throw new BusinessException(UserErrorCode.ACCOUNT_ALREADY_EXISTS);
        }

        Account account = Account.of(
                user,
                request.bankName(),
                request.accountNumber(),
                request.holderName()
        );

        Account savedAccount = accountRepository.save(account);
        return AccountResponse.from(savedAccount);
    }

    // 계좌 조회
    @Transactional(readOnly = true)
    public AccountResponse getAccount(User user) {
        Account account = accountRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.ACCOUNT_NOT_FOUND));
        return AccountResponse.from(account);
    }

    // 계좌 정보 수정
    public AccountResponse updateAccount(User user, AccountRequest request) {
        Account account = accountRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.ACCOUNT_NOT_FOUND));

        account.update(
                request.bankName(),
                request.accountNumber(),
                request.holderName()
        );

        Account savedAccount = accountRepository.save(account);
        return AccountResponse.from(savedAccount);
    }

    // 계좌 삭제
    public void deleteAccount(User user) {
        Account account = accountRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(UserErrorCode.ACCOUNT_NOT_FOUND));
        accountRepository.delete(account);
    }
}
