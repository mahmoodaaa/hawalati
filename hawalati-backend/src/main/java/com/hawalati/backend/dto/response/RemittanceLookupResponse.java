package com.hawalati.backend.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RemittanceLookupResponse {
    private String status; // AVAILABLE | NOT_FOUND | ALREADY_RECEIVED | PROVIDER_MISMATCH
    private RemittanceResponse remittance;
    private String expectedProvider;
}
