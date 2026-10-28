package com.hawalati.backend.service;

import com.hawalati.backend.dto.request.ChangePasswordRequest;
import com.hawalati.backend.dto.request.UpdateProfileRequest;
import com.hawalati.backend.dto.response.DocumentResponse;
import com.hawalati.backend.dto.response.KycResponse;
import com.hawalati.backend.dto.response.MessageResponse;
import com.hawalati.backend.dto.response.UserProfileResponse;
import com.hawalati.backend.enums.DocumentType;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {

    UserProfileResponse getProfile();

    UserProfileResponse updateProfile(UpdateProfileRequest request);

    MessageResponse changePassword(ChangePasswordRequest request);

    DocumentResponse uploadDocument(MultipartFile file, DocumentType documentType);

    DocumentResponse getDocument();

    KycResponse submitKyc();
}
