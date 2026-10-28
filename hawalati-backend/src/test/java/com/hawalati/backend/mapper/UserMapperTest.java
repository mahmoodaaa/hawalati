package com.hawalati.backend.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.hawalati.backend.dto.request.RegisterRequest;
import com.hawalati.backend.dto.request.UpdateProfileRequest;
import com.hawalati.backend.dto.response.UserProfileResponse;
import com.hawalati.backend.entity.User;
import com.hawalati.backend.enums.DocumentType;
import com.hawalati.backend.enums.KycStatus;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class UserMapperTest {

    private final UserMapper mapper = new UserMapper();

    @Test
    void toEntityMapsFrontendFullNameToArabicNameAndKeepsAccountDisabled() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("أحمد محمد خالد العمري")
                .fullNameEn("Ahmad Mohammed Al-Omari")
                .nationalId("1234567890")
                .dateOfBirth(LocalDate.of(1995, 5, 12))
                .placeOfBirth("عمّان")
                .address("عمان")
                .phone("0791234567")
                .documentType(DocumentType.NATIONAL_ID)
                .username("Ahmad.Omari")
                .password("secret1")
                .build();

        User user = mapper.toEntity(request);

        assertEquals("أحمد محمد خالد العمري", user.getFullNameAr());
        assertEquals("ahmad.omari", user.getUsername());
        assertEquals(KycStatus.PENDING, user.getKycStatus());
        assertFalse(user.isEnabled());
        assertFalse(user.isDocumentVerified());
    }

    @Test
    void toProfileResponseNeverExposesPasswordAndUsesFrontendFullName() {
        User user = User.builder()
                .fullNameAr("أحمد محمد خالد العمري")
                .fullNameEn("Ahmad Mohammed Al-Omari")
                .nationalId("1234567890")
                .username("ahmad.omari")
                .password("hashed-secret")
                .kycStatus(KycStatus.PENDING)
                .build();

        UserProfileResponse response = mapper.toProfileResponse(user);

        assertEquals("أحمد محمد خالد العمري", response.getFullName());
        assertEquals("1234567890", response.getNationalId());
        assertNull(response.getCreatedAt());
    }

    @Test
    void applyUpdateDoesNotTouchNationalIdOrPassword() {
        User user = User.builder()
                .fullNameAr("قديم")
                .fullNameEn("Old Name")
                .nationalId("1234567890")
                .username("old.user")
                .password("hashed-secret")
                .phone("0790000000")
                .placeOfBirth("إربد")
                .address("إربد")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .build();

        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("اسم جديد")
                .fullNameEn("New English Name")
                .phone("0791111111")
                .placeOfBirth("عمّان")
                .address("عمان")
                .username("New.User")
                .dateOfBirth(LocalDate.of(1991, 2, 2))
                .build();

        mapper.applyUpdate(user, request);

        assertEquals("اسم جديد", user.getFullNameAr());
        assertEquals("new.user", user.getUsername());
        assertEquals("1234567890", user.getNationalId());
        assertEquals("hashed-secret", user.getPassword());
    }
}
