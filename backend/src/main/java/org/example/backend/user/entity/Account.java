package org.example.backend.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.example.backend.global.util.StringEncryptor;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Convert(converter = StringEncryptor.class)
    @Column(name = "bank_name", nullable = false)
    private String bankName;

    @Convert(converter = StringEncryptor.class)
    @Column(name = "account_number", nullable = false)
    private String accountNumber;

    @Convert(converter = StringEncryptor.class)
    @Column(name = "holder_name", nullable = false)
    private String holderName;

    private Account(
            User user,
            String bankName,
            String accountNumber,
            String holderName
    ) {
        this.user = user;
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.holderName = holderName;
    }

    public static Account of(
            User user,
            String bankName,
            String accountNumber,
            String holderName
    ) {
        return new Account(
                user,
                bankName,
                accountNumber,
                holderName
        );
    }

    public void update(
            String bankName,
            String accountNumber,
            String holderName
    ) {
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.holderName = holderName;
    }
}
