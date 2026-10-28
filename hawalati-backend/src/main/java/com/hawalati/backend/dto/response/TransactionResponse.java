package com.hawalati.backend.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {
    private UUID id;
    private String referenceNumber;
    private String provider;
    private String senderName;
    private String senderCountry;
    private BigDecimal amount;
    private String currency;
    private BigDecimal amountJOD;
    private BigDecimal fee;
    private BigDecimal netAmount;
    private DestinationResponse destination;
    private String status;
    private LocalDateTime confirmedAt;
}
