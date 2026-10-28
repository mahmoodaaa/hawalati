package com.hawalati.backend.service;

import com.hawalati.backend.dto.request.LoginRequest;
import com.hawalati.backend.dto.request.RefreshTokenRequest;
import com.hawalati.backend.dto.request.RegisterRequest;
import com.hawalati.backend.dto.request.ResendOtpRequest;
import com.hawalati.backend.dto.request.VerifyOtpRequest;
import com.hawalati.backend.dto.response.AuthResponse;
import com.hawalati.backend.dto.response.MessageResponse;
import com.hawalati.backend.dto.response.OtpPendingResponse;

public interface AuthService {

    OtpPendingResponse register(RegisterRequest request);

    OtpPendingResponse login(LoginRequest request);

    AuthResponse verifyOtp(VerifyOtpRequest request);

    OtpPendingResponse resendOtp(ResendOtpRequest request);

    AuthResponse refresh(RefreshTokenRequest request);

    MessageResponse logout(RefreshTokenRequest request);
}
