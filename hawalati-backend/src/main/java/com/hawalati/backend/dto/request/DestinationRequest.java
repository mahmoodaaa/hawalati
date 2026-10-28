package com.hawalati.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DestinationRequest {
    @NotBlank
    private String type; // bank | wallet
    @Valid @NotNull
    private Details details;

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Details {
        private String bankId;
        private String bankName;
        private String iban;
        private String accountName;
        private String walletId;
        private String walletName;
        private String walletPhone;
    }
}
