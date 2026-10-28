package com.hawalati.backend.dto.request;

import com.hawalati.backend.enums.OtpPurpose;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class VerifyOtpRequest {

    @NotBlank(message = "اسم المستخدم مطلوب")
    private String username;

    @NotBlank(message = "رمز التحقق مطلوب")
    private String code;

    @NotNull(message = "غرض رمز التحقق مطلوب")
    private OtpPurpose purpose;
}
