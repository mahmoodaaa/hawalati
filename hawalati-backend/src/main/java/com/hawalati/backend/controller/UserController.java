package com.hawalati.backend.controller;

import com.hawalati.backend.dto.request.ChangePasswordRequest;
import com.hawalati.backend.dto.request.UpdateProfileRequest;
import com.hawalati.backend.dto.response.DocumentResponse;
import com.hawalati.backend.dto.response.KycResponse;
import com.hawalati.backend.dto.response.MessageResponse;
import com.hawalati.backend.dto.response.UserProfileResponse;
import com.hawalati.backend.enums.DocumentType;
import com.hawalati.backend.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "User Profile")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    @Operation(summary = "Get the authenticated user's profile")
    public ResponseEntity<UserProfileResponse> getProfile() {
        return ResponseEntity.ok(userService.getProfile());
    }

    @PutMapping("/profile")
    @Operation(summary = "Update allowed profile fields (nationalId and password are protected)")
    public ResponseEntity<UserProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(request));
    }

    @PutMapping("/change-password")
    @Operation(summary = "Change password and revoke active refresh tokens")
    public ResponseEntity<MessageResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ResponseEntity.ok(userService.changePassword(request));
    }


    @PutMapping(value = "/document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload or replace identity document")
    public ResponseEntity<DocumentResponse> uploadDocument(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "documentType", required = false) String documentType) {

        DocumentType type = DocumentType.fromValue(documentType);
        return ResponseEntity.ok(userService.uploadDocument(file, type));
    }


    @GetMapping("/document")
    @Operation(summary = "Get metadata of the authenticated user's document")
    public ResponseEntity<DocumentResponse> getDocument() {
        return ResponseEntity.ok(userService.getDocument());
    }

    @PostMapping("/kyc")
    @Operation(summary = "Run demo KYC verification")
    public ResponseEntity<KycResponse> submitKyc() {
        return ResponseEntity.ok(userService.submitKyc());
    }
}
