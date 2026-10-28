package com.hawalati.backend.entity;

import com.hawalati.backend.enums.TransactionStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions", uniqueConstraints = @UniqueConstraint(name = "uk_transaction_remittance", columnNames = "remittance_id"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class Transaction {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "remittance_id", nullable = false, unique = true)
    private MockRemittance remittance;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal fee;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal netAmount;

    @Column(nullable = false, length = 10)
    private String destinationType;

    private String bankId;
    private String bankName;
    private String iban;
    private String accountName;
    private String walletId;
    private String walletName;
    private String walletPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status;

    @Column(nullable = false)
    private LocalDateTime confirmedAt;

    @PrePersist
    public void onCreate() {
        if (confirmedAt == null) confirmedAt = LocalDateTime.now();
    }
}
