package com.hawalati.backend.entity;

import com.hawalati.backend.enums.RemittanceStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "mock_remittances", uniqueConstraints = @UniqueConstraint(columnNames = "reference_number"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class MockRemittance {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "reference_number", nullable = false, unique = true, length = 70)
    private String referenceNumber;

    @Column(nullable = false, length = 60)
    private String provider;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amountJod;

    @Column(nullable = false)
    private String senderName;

    @Column(nullable = false)
    private String senderCountry;

    @Column(nullable = false, length = 10)
    private String beneficiaryNationalId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RemittanceStatus status;

    @Column(nullable = false)
    private LocalDate expiryDate;
}
