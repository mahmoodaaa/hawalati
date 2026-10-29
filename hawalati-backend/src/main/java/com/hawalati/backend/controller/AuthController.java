package com.hawalati.backend.controller;

import com.hawalati.backend.dto.request.LoginRequest;
import com.hawalati.backend.dto.request.RefreshTokenRequest;
import com.hawalati.backend.dto.request.ResendOtpRequest;
import com.hawalati.backend.dto.request.VerifyOtpRequest;
import com.hawalati.backend.dto.response.AuthResponse;
import com.hawalati.backend.dto.response.MessageResponse;
import com.hawalati.backend.dto.response.OtpPendingResponse;
import com.hawalati.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hawalati.backend.dto.request.SendPhoneOtpRequest;
import com.hawalati.backend.dto.request.VerifyPhoneOtpRequest;
import com.hawalati.backend.dto.request.CompleteRegistrationRequest;
import com.hawalati.backend.dto.response.RegistrationTokenResponse;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Encoding;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Validate credentials and send OTP")
    public ResponseEntity<OtpPendingResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify LOGIN OTP and return access/refresh tokens",
            description = "Only purpose=LOGIN is accepted. Other purposes return 400 Bad Request.")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request));
    }

    @PostMapping("/resend-otp")
    @Operation(summary = "Invalidate previous LOGIN OTP and send a new one",
            description = "Only purpose=LOGIN is accepted. Other purposes return 400 Bad Request.")
    public ResponseEntity<OtpPendingResponse> resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        return ResponseEntity.ok(authService.resendOtp(request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate refresh token and issue a new access token")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke the presented refresh token")
    public ResponseEntity<MessageResponse> logout(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.logout(request));
    }

    @PostMapping("/phone-otp/send")
    @Operation(summary = "Start demo phone verification")
    public ResponseEntity<MessageResponse> sendPhoneOtp(
            @Valid @RequestBody SendPhoneOtpRequest request) {

        return ResponseEntity.ok(authService.sendPhoneOtp(request));
    }

    @PostMapping("/phone-otp/verify")
    @Operation(summary = "Verify demo phone OTP")
    public ResponseEntity<RegistrationTokenResponse> verifyPhoneOtp(
            @Valid @RequestBody VerifyPhoneOtpRequest request) {

        return ResponseEntity.ok(authService.verifyPhoneOtp(request));
    }


    @PostMapping(
            value = "/registration/complete",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Operation(summary = "Complete registration with identity document")
    public ResponseEntity<AuthResponse> completeRegistration(

            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    content = @Content(
                            encoding = @Encoding(
                                    name = "data",
                                    contentType = MediaType.APPLICATION_JSON_VALUE
                            )
                    )
            )
            @Valid @RequestPart("data") CompleteRegistrationRequest request,

            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.completeRegistration(request, file));
    }




}
