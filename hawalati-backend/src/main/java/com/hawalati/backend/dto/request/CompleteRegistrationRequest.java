
package com.hawalati.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CompleteRegistrationRequest {

    @NotBlank
    private String registrationToken;

    @Valid
    @NotNull
    private RegisterRequest registration;
}
