package com.hawalati.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiveRemittanceRequest {
    @NotNull
    private UUID remittanceId;
    @Valid @NotNull
    private DestinationRequest destination;
    @AssertTrue(message = "يجب الموافقة على تفاصيل الحوالة")
    private boolean agreed;
}
