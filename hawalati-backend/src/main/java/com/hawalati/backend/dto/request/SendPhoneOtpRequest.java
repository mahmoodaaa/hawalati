package com.hawalati.backend.dto.request;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendPhoneOtpRequest {

    @NotBlank(message = "رقم الهاتف مطلوب")
    @Pattern(
            regexp = "^(07\\d{8}|009627\\d{8}|\\+9627\\d{8})$",
            message = "رقم الهاتف غير صالح"
    )
    private String phone;
}
