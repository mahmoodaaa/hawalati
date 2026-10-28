package com.hawalati.backend.dto.response;

import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class DestinationResponse {
    private String type;
    private String bankId;
    private String bankName;
    private String iban;
    private String accountName;
    private String walletId;
    private String walletName;
    private String walletPhone;
}
