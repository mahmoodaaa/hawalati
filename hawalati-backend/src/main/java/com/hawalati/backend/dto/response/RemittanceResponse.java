package com.hawalati.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RemittanceResponse {
    private UUID id;
    private String referenceNumber;
    private String mtcn;
    private String provider;
    private BigDecimal amount;
    private String currency;
    private BigDecimal amountJOD;
    private String senderName;
    private String senderCountry;
    private String status;
    private LocalDate expiryDate;
}
