package com.hawalati.backend.mapper;

import com.hawalati.backend.dto.request.RegisterRequest;
import com.hawalati.backend.dto.request.UpdateProfileRequest;
import com.hawalati.backend.dto.response.UserProfileResponse;
import com.hawalati.backend.entity.User;
import com.hawalati.backend.enums.KycStatus;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public User toEntity(RegisterRequest request) {
        return User.builder()
                .fullNameAr(trim(request.getFullName()))
                .fullNameEn(trim(request.getFullNameEn()))
                .nationalId(trim(request.getNationalId()))
                .dateOfBirth(request.getDateOfBirth())
                .placeOfBirth(trim(request.getPlaceOfBirth()))
                .address(trim(request.getAddress()))
                .phone(normalizePhone(request.getPhone()))
                .username(normalizeUsername(request.getUsername()))
                .password(request.getPassword())
                .documentType(request.getDocumentType())
                .documentVerified(false)
                .kycStatus(KycStatus.PENDING)
                .enabled(false)
                .build();
    }

    public UserProfileResponse toProfileResponse(User user) {
        if (user == null) {
            return null;
        }
        return UserProfileResponse.builder()
                .id(user.getId())
                .fullName(user.getFullNameAr())
                .fullNameEn(user.getFullNameEn())
                .nationalId(user.getNationalId())
                .dateOfBirth(user.getDateOfBirth())
                .placeOfBirth(user.getPlaceOfBirth())
                .address(user.getAddress())
                .phone(user.getPhone())
                .username(user.getUsername())
                .documentType(user.getDocumentType())
                .documentVerified(user.isDocumentVerified())
                .kycStatus(user.getKycStatus())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }

    public void applyUpdate(User user, UpdateProfileRequest request) {
        user.setFullNameAr(trim(request.getFullName()));
        user.setFullNameEn(trim(request.getFullNameEn()));
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        user.setPlaceOfBirth(trim(request.getPlaceOfBirth()));
        user.setAddress(trim(request.getAddress()));
        user.setPhone(normalizePhone(request.getPhone()));
        user.setUsername(normalizeUsername(request.getUsername()));
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizeUsername(String username) {
        return username == null ? null : username.trim().toLowerCase();
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        return phone.replaceAll("[\\s-]", "").trim();
    }
}
