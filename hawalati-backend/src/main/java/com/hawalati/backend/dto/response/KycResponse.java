package com.hawalati.backend.dto.response;

import com.hawalati.backend.enums.KycStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KycResponse {

    private KycStatus status;
    private boolean demo;
    private String message;
}
