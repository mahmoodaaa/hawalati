package com.hawalati.backend.service.impl;

import com.hawalati.backend.config.JwtProperties;
import com.hawalati.backend.config.OtpProperties;
import com.hawalati.backend.dto.request.LoginRequest;
import com.hawalati.backend.dto.request.RefreshTokenRequest;
import com.hawalati.backend.dto.request.RegisterRequest;
import com.hawalati.backend.dto.request.ResendOtpRequest;
import com.hawalati.backend.dto.request.VerifyOtpRequest;
import com.hawalati.backend.dto.response.AuthResponse;
import com.hawalati.backend.dto.response.MessageResponse;
import com.hawalati.backend.dto.response.OtpPendingResponse;
import com.hawalati.backend.entity.OtpVerification;
import com.hawalati.backend.entity.RefreshToken;
import com.hawalati.backend.entity.User;
import com.hawalati.backend.enums.OtpPurpose;
import com.hawalati.backend.exception.ApiException;
import com.hawalati.backend.mapper.UserMapper;
import com.hawalati.backend.repository.OtpVerificationRepository;
import com.hawalati.backend.repository.RefreshTokenRepository;
import com.hawalati.backend.repository.UserRepository;
import com.hawalati.backend.security.HashUtil;
import com.hawalati.backend.security.JwtProvider;
import com.hawalati.backend.service.AuthService;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final OtpVerificationRepository otpVerificationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final JwtProperties jwtProperties;
    private final OtpProperties otpProperties;

    @Override
    public OtpPendingResponse register(RegisterRequest request) {
        if (userRepository.existsByNationalId(request.getNationalId().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "الرقم الوطني مسجّل مسبقًا. يرجى تسجيل الدخول.");
        }
        String username = normalizeUsername(request.getUsername());
        if (userRepository.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "اسم المستخدم مأخوذ، اختر اسماً آخر.");
        }
        String phone = request.getPhone() == null ? "" : request.getPhone().replaceAll("[\\s-]", "").trim();
        if (userRepository.existsByPhone(phone)) {
            throw new ApiException(HttpStatus.CONFLICT, "رقم الهاتف مسجّل مسبقًا.");
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEnabled(false);
        userRepository.save(user);
        issueOtp(user, OtpPurpose.REGISTER);

        return OtpPendingResponse.builder()
                .message("تم إنشاء الحساب. أدخل رمز التحقق لإكمال التسجيل.")
                .user(userMapper.toProfileResponse(user))
                .build();
    }

    @Override
    public OtpPendingResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(normalizeUsername(request.getUsername()))
                .orElseThrow(() -> invalidCredentials());
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw invalidCredentials();
        }
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "الحساب غير مفعّل، أكمل تأكيد التسجيل أولاً");
        }
        issueOtp(user, OtpPurpose.LOGIN);

        return OtpPendingResponse.builder()
                .message("تم التحقق من البيانات. أدخل رمز التحقق لإكمال الدخول.")
                .user(userMapper.toProfileResponse(user))
                .build();
    }

    @Override
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse verifyOtp(VerifyOtpRequest request) {
        User user = userRepository.findByUsername(normalizeUsername(request.getUsername()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "لا يوجد رمز تحقق صالح"));

        if (request.getPurpose() == OtpPurpose.LOGIN
                && !user.isEnabled()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN, "الحساب غير مفعّل");}

        if (request.getPurpose() == OtpPurpose.REGISTER
                && user.isEnabled()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "الحساب مفعّل مسبقاً");
        }

        OtpVerification otp = otpVerificationRepository
                .findFirstByUserAndPurposeAndUsedFalseOrderByCreatedAtDesc(user, request.getPurpose())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "لا يوجد رمز تحقق صالح"));

        if (otp.isExpired()) {
            otp.setUsed(true);
            throw new ApiException(HttpStatus.BAD_REQUEST, "انتهت صلاحية رمز التحقق");
        }
        if (otp.hasExceededAttempts()) {
            otp.setUsed(true);
            throw new ApiException(HttpStatus.BAD_REQUEST, "تم تجاوز عدد المحاولات، اطلب رمزاً جديداً");
        }

        if (!HashUtil.sha256Matches(request.getCode().trim(), otp.getCodeHash())) {
            otp.setAttempts(otp.getAttempts() + 1);
            if (otp.hasExceededAttempts()) {
                otp.setUsed(true);
                throw new ApiException(HttpStatus.BAD_REQUEST, "تم تجاوز عدد المحاولات، اطلب رمزاً جديداً");
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "رمز التحقق غير صحيح");
        }

        otp.setUsed(true);

        if (request.getPurpose() == OtpPurpose.REGISTER) {
            user.setEnabled(true);
            userRepository.save(user);
        }

        return issueSession(user);
    }

    @Override
    public OtpPendingResponse resendOtp(ResendOtpRequest request) {

        User user = userRepository
                .findByUsername(normalizeUsername(request.getUsername()))
                .orElseThrow(() -> invalidCredentials());

        // Must prove account ownership first
        if (!passwordEncoder.matches(
                request.getPassword(), user.getPassword())) {
            throw invalidCredentials();
        }

        if (request.getPurpose() == OtpPurpose.LOGIN
                && !user.isEnabled()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "يجب تأكيد التسجيل أولاً"
            );
        }

        if (request.getPurpose() == OtpPurpose.REGISTER
                && user.isEnabled()) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "الحساب مفعّل بالفعل"
            );
        }

        issueOtp(user, request.getPurpose());

        return OtpPendingResponse.builder()
                .message("تم إنشاء رمز تحقق جديد")
                .user(userMapper.toProfileResponse(user))
                .build();
    }

    @Override
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse refresh(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken().trim();
        String error = jwtProvider.describeValidationError(refreshToken);
        if (error != null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, error);
        }
        if (!jwtProvider.isRefreshToken(refreshToken)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "رمز التجديد غير صالح");
        }

        RefreshToken stored = refreshTokenRepository.findByTokenHash(HashUtil.sha256(refreshToken))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "رمز التجديد غير صالح"));

        User user = stored.getUser();
        if (stored.isRevoked()) {
            refreshTokenRepository.revokeAllForUser(user);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "تم إلغاء الجلسة. يرجى تسجيل الدخول مرة أخرى.");
        }
        if (stored.isExpired() || !user.getId().equals(jwtProvider.extractUserId(refreshToken))) {
            stored.setRevoked(true);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "رمز التجديد غير صالح");
        }
        if (!user.isEnabled()) {
            stored.setRevoked(true);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "الحساب غير مفعّل");
        }

        stored.setRevoked(true);
        AuthResponse response = issueSession(user);
        stored.setReplacedBy(refreshTokenRepository.findByTokenHash(HashUtil.sha256(response.getRefreshToken()))
                .map(RefreshToken::getId)
                .orElse(null));
        return response;
    }

    @Override
    public MessageResponse logout(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken().trim();
        refreshTokenRepository.findByTokenHash(HashUtil.sha256(refreshToken))
                .ifPresent(token -> token.setRevoked(true));
        return MessageResponse.builder()
                .message("تم تسجيل الخروج بنجاح")
                .build();
    }

    private AuthResponse issueSession(User user) {
        String accessToken = jwtProvider.generateAccessToken(user);
        String refreshToken = jwtProvider.generateRefreshToken(user);

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(HashUtil.sha256(refreshToken))
                .expiresAt(LocalDateTime.now().plus(jwtProperties.refreshTokenExpiration(), ChronoUnit.MILLIS))
                .revoked(false)
                .build());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(userMapper.toProfileResponse(user))
                .build();
    }

    private void issueOtp(User user, OtpPurpose purpose) {
        otpVerificationRepository.invalidateActive(user, purpose);

        String code = otpProperties.demoEnabled()
                ? otpProperties.demoCode()
                : String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));

        otpVerificationRepository.save(OtpVerification.builder()
                .user(user)
                .purpose(purpose)
                .codeHash(HashUtil.sha256(code))
                .expiresAt(LocalDateTime.now().plusMinutes(Math.max(1, otpProperties.expiryMinutes())))
                .attempts(0)
                .maxAttempts(Math.max(1, otpProperties.maxAttempts()))
                .used(false)
                .build());
    }

    private String normalizeUsername(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "اسم المستخدم أو كلمة المرور غير صحيحة.");
    }
}
