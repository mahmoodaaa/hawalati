package com.hawalati.backend.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
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
public class UpdateProfileRequest {

    @Schema(example = "أحمد محمد علي خالد")
    @NotBlank(message = "الاسم الرباعي بالعربي مطلوب")
    private String fullName;

    @Schema(example = "Ahmad Mohammad Ali Khaled")
    @NotBlank(message = "الاسم بالإنجليزي مطلوب")
    @Pattern(
            regexp = "^[a-zA-Z]+(?:[\\s\\-]+[a-zA-Z]+)+$",
            message = "أدخل الاسم الرباعي بالأحرف الإنجليزية (مثال: Ahmad Mohammed Al-Ahmad)"
    )
    private String fullNameEn;

    @Schema(example = "1998-05-12")
    @Past(message = "تاريخ الميلاد يجب أن يكون في الماضي")
    private LocalDate dateOfBirth;

    @Schema(example = "Amman")
    @NotBlank(message = "مكان الميلاد مطلوب")
    private String placeOfBirth;

    @Schema(example = "Amman, Jordan")
    @NotBlank(message = "مكان السكن مطلوب")
    private String address;

    @Schema(example = "0791234567")
    @NotBlank(message = "رقم الهاتف مطلوب")
    @Pattern(
            regexp = "^(07\\d{8}|009627\\d{8}|\\+9627\\d{8})$",
            message = "رقم الهاتف غير صالح (مثال: 0791234567)"
    )
    private String phone;

    @Schema(example = "ahmad.khaled")
    @NotBlank(message = "اسم المستخدم مطلوب")
    @Size(min = 4, message = "اسم المستخدم يجب أن يكون 4 أحرف على الأقل")
    @Pattern(
            regexp = "^[a-zA-Z0-9_.\\s]+$",
            message = "يُسمح بالأحرف الإنجليزية والأرقام والمسافة والنقطة فقط"
    )
    private String username;
}
