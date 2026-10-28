
package com.hawalati.backend.dto.request;

import com.hawalati.backend.enums.DocumentType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    // Arabic Full Name
    @Schema(example = "أحمد محمد علي خالد")
    @NotBlank(message = "الاسم الرباعي بالعربي مطلوب")
    @Size(max = 100)
    private String fullName;

    // English Full Name
    @Schema(example = "Ahmad Mohammad Ali Khaled")
    @NotBlank(message = "الاسم بالإنجليزي مطلوب")
    @Size(max = 100)
    @Pattern(
            regexp = "^[a-zA-Z]+(?:[\\s\\-]+[a-zA-Z]+)+$",
            message = "أدخل الاسم بالأحرف الإنجليزية"
    )
    private String fullNameEn;

    // National ID
    @Schema(example = "9912345678")
    @NotBlank(message = "الرقم الوطني مطلوب")
    @Pattern(
            regexp = "^\\d{10}$",
            message = "الرقم الوطني يجب أن يتكون من 10 أرقام"
    )
    private String nationalId;

    // Date of Birth
    @Schema(example = "1998-05-12", type = "string", format = "date")
    @NotNull(message = "تاريخ الميلاد مطلوب")
    @Past(message = "تاريخ الميلاد يجب أن يكون في الماضي")
    private LocalDate dateOfBirth;

    // Place of Birth
    @Schema(example = "Amman")
    @NotBlank(message = "مكان الميلاد مطلوب")
    @Size(max = 100)
    private String placeOfBirth;

    // Address
    @Schema(example = "Amman, Jordan")
    @NotBlank(message = "مكان السكن مطلوب")
    @Size(max = 200)
    private String address;

    // Phone Number
    @Schema(example = "0791234567")
    @NotBlank(message = "رقم الهاتف مطلوب")
    @Pattern(
            regexp = "^(07\\d{8}|009627\\d{8}|\\+9627\\d{8})$",
            message = "رقم الهاتف غير صالح"
    )
    private String phone;

    // Document Type
    @Schema(example = "national_id")
    @NotNull(message = "نوع الوثيقة مطلوب")
    private DocumentType documentType;

    // Username
    @Schema(example = "ahmad.demo26")
    @NotBlank(message = "اسم المستخدم مطلوب")
    @Size(min = 4, max = 50)
    @Pattern(
            regexp = "^[a-zA-Z0-9_.\\s]+$",
            message = "اسم المستخدم يحتوي على أحرف غير مسموحة"
    )
    private String username;

    // Password
    @Schema(example = "Demo@12345", format = "password")
    @NotBlank(message = "كلمة المرور مطلوبة")
    @Size(min = 6, message = "كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    private String password;
}
