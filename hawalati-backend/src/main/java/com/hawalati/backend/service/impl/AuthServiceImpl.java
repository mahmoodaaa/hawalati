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

import com.hawalati.backend.dto.request.SendPhoneOtpRequest;
import com.hawalati.backend.dto.request.VerifyPhoneOtpRequest;
import com.hawalati.backend.dto.request.CompleteRegistrationRequest;
import com.hawalati.backend.dto.response.RegistrationTokenResponse;

import com.hawalati.backend.entity.UserDocument;
import com.hawalati.backend.enums.KycStatus;
import com.hawalati.backend.repository.UserDocumentRepository;
import com.hawalati.backend.service.DocumentStorageService;
import com.hawalati.backend.service.DocumentStorageService.StoredFile;

import io.jsonwebtoken.JwtException;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;


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

    private final UserDocumentRepository userDocumentRepository;
    private final DocumentStorageService documentStorageService;
    private final Environment environment;

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
        requireLoginPurpose(request.getPurpose());
        User user = userRepository.findByUsername(normalizeUsername(request.getUsername()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "لا يوجد رمز تحقق صالح"));

        if (!user.isEnabled()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN, "الحساب غير مفعّل");}


        OtpVerification otp = otpVerificationRepository
                .findFirstByUserAndPurposeAndUsedFalseOrderByCreatedAtDesc(user, OtpPurpose.LOGIN)
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


        return issueSession(user);
    }

    @Override
    public OtpPendingResponse resendOtp(ResendOtpRequest request) {
        requireLoginPurpose(request.getPurpose());

        User user = userRepository
                .findByUsername(normalizeUsername(request.getUsername()))
                .orElseThrow(() -> invalidCredentials());

        // Must prove account ownership first
        if (!passwordEncoder.matches(
                request.getPassword(), user.getPassword())) {
            throw invalidCredentials();
        }

        if (!user.isEnabled()) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "يجب تأكيد التسجيل أولاً"
            );
        }


        issueOtp(user, OtpPurpose.LOGIN);

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


    @Override
    public MessageResponse sendPhoneOtp(SendPhoneOtpRequest request) {
        requireDemoRegistration();

        String phone = normalizePhone(request.getPhone());

        if (userRepository.existsByPhone(phone)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "رقم الهاتف مسجّل مسبقًا"
            );
        }

        // Demo only: no real SMS is sent.
        return MessageResponse.builder()
                .message("تم تجهيز رمز التحقق التجريبي")
                .build();
    }

    @Override
    public RegistrationTokenResponse verifyPhoneOtp(
            VerifyPhoneOtpRequest request) {

        requireDemoRegistration();

        String phone = normalizePhone(request.getPhone());

        if (userRepository.existsByPhone(phone)) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "رقم الهاتف مسجّل مسبقًا"
            );
        }

        if (!otpProperties.demoCode().equals(request.getCode())) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "رمز التحقق غير صحيح"
            );
        }

        String token = jwtProvider.generateRegistrationToken(phone);

        return RegistrationTokenResponse.builder()
                .registrationToken(token)
                .tokenType("Registration")
                .expiresIn(900)
                .build();
    }



    @Override
    public AuthResponse completeRegistration(CompleteRegistrationRequest request, MultipartFile file) {

        requireDemoRegistration();

        RegisterRequest registration = request.getRegistration();
        String phone = normalizePhone(registration.getPhone());

        // 1. Validate the temporary registration token
        String verifiedPhone;
        try {
            verifiedPhone = jwtProvider.validateRegistrationToken(
                    request.getRegistrationToken()
            );
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    "تصريح التسجيل غير صالح أو منتهي الصلاحية"
            );
        }

        // The verified phone must match the submitted phone
        if (!phone.equals(verifiedPhone)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "رقم الهاتف لا يطابق الرقم الذي تم التحقق منه"
            );
        }

        // 2. Check uniqueness
        String username = normalizeUsername(registration.getUsername());

        if (userRepository.existsByNationalId(
                registration.getNationalId().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "الرقم الوطني مسجّل مسبقًا");
        }

        if (userRepository.existsByPhone(phone)) {
            throw new ApiException(
                    HttpStatus.CONFLICT, "رقم الهاتف مسجّل مسبقًا");
        }

        if (userRepository.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "اسم المستخدم مأخوذ");
        }

        // 3. Create the actual User
        User user = userMapper.toEntity(registration);
        user.setPhone(phone);
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(registration.getPassword()));
        user.setEnabled(true);
        user.setKycStatus(KycStatus.PENDING);

        userRepository.saveAndFlush(user);

        // 4. Store the document file
        StoredFile stored = documentStorageService.store(file);

        // Remove the file if the DB transaction fails
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) {
                            documentStorageService.delete(
                                    stored.storedFileName()
                            );
                        }
                    }
                }
        );

        UserDocument document = UserDocument.builder()
                .user(user)
                .documentType(registration.getDocumentType())
                .storedFileName(stored.storedFileName())
                .contentType(stored.contentType())
                .fileSize(stored.fileSize())
                .uploadedAt(LocalDateTime.now())
                .build();

        userDocumentRepository.saveAndFlush(document);

        // 5. Demo KYC only (not real identity verification)
        user.setKycStatus(KycStatus.DEMO_VERIFIED);
        userRepository.save(user);

        // 6. Issue the normal access and refresh tokens
        AuthResponse response = issueSession(user);
        response.getUser().setDocumentUploaded(true);

        return response;
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

    private void requireLoginPurpose(OtpPurpose purpose) {
        if (purpose != OtpPurpose.LOGIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only LOGIN OTP is supported by this endpoint.");
        }
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



    private String normalizePhone(String phone) {
        return phone == null
                ? ""
                : phone.replaceAll("[\\s-]", "").trim();
    }

    private void requireDemoRegistration() {
        if (!otpProperties.demoEnabled()
                || !environment.acceptsProfiles(Profiles.of("demo"))) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "التسجيل التجريبي متاح فقط في وضع Demo"
            );
        }
    }





}
