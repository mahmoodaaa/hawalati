package com.hawalati.backend.service;

import com.hawalati.backend.dto.request.LoginRequest;
import com.hawalati.backend.dto.request.RefreshTokenRequest;
import com.hawalati.backend.dto.request.ResendOtpRequest;
import com.hawalati.backend.dto.request.VerifyOtpRequest;
import com.hawalati.backend.dto.response.AuthResponse;
import com.hawalati.backend.dto.response.MessageResponse;
import com.hawalati.backend.dto.response.OtpPendingResponse;
import com.hawalati.backend.dto.request.SendPhoneOtpRequest;
import com.hawalati.backend.dto.request.VerifyPhoneOtpRequest;
import com.hawalati.backend.dto.request.CompleteRegistrationRequest;
import com.hawalati.backend.dto.response.RegistrationTokenResponse;
import org.springframework.web.multipart.MultipartFile;

public interface AuthService {

    OtpPendingResponse login(LoginRequest request);

    AuthResponse verifyOtp(VerifyOtpRequest request);

    OtpPendingResponse resendOtp(ResendOtpRequest request);

    AuthResponse refresh(RefreshTokenRequest request);

    MessageResponse logout(RefreshTokenRequest request);


    MessageResponse sendPhoneOtp(SendPhoneOtpRequest request);

    RegistrationTokenResponse verifyPhoneOtp(VerifyPhoneOtpRequest request);

    AuthResponse completeRegistration(CompleteRegistrationRequest request, MultipartFile file);


}


