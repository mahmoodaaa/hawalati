package com.hawalati.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyPhoneOtpRequest {

    @NotBlank
    @Pattern(
            regexp = "^(07\\d{8}|009627\\d{8}|\\+9627\\d{8})$",
            message = "رقم الهاتف غير صالح"
    )
    private String phone;

    @NotBlank
    @Pattern(regexp = "^\\d{6}$")
    private String code;
}
