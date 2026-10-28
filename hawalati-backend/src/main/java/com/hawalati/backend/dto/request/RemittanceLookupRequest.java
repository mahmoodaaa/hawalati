package com.hawalati.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class RemittanceLookupRequest {
    @NotBlank
    private String referenceNumber;
    @NotBlank
    private String providerId;
    // Approximate amount entered in JOD on the React screen
    @NotNull @DecimalMin("0.01")
    private BigDecimal approxAmount;
}
