package com.hawalati.backend.dto.response;

import com.hawalati.backend.enums.DocumentType;
import com.hawalati.backend.enums.KycStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
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
public class UserProfileResponse {

    private UUID id;
    private String fullName;
    private String fullNameEn;
    private String nationalId;
    private LocalDate dateOfBirth;
    private String placeOfBirth;
    private String address;
    private String phone;
    private String username;
    private DocumentType documentType;
    private boolean documentVerified;
    private boolean documentUploaded;
    private KycStatus kycStatus;
    private boolean enabled;
    private LocalDateTime createdAt;
}
