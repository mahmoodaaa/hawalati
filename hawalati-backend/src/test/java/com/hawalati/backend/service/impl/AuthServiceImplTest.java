package com.hawalati.backend.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.hawalati.backend.config.JwtProperties;
import com.hawalati.backend.config.OtpProperties;
import com.hawalati.backend.controller.AuthController;
import com.hawalati.backend.dto.request.*;
import com.hawalati.backend.entity.*;
import com.hawalati.backend.enums.*;
import com.hawalati.backend.exception.ApiException;
import com.hawalati.backend.exception.GlobalExceptionHandler;
import com.hawalati.backend.mapper.UserMapper;
import com.hawalati.backend.repository.*;
import com.hawalati.backend.security.*;
import com.hawalati.backend.service.DocumentStorageService;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthServiceImplTest {
    private final UserRepository users = mock(UserRepository.class);
    private final OtpVerificationRepository otps = mock(OtpVerificationRepository.class);
    private final RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final JwtProvider jwt = mock(JwtProvider.class);
    private AuthServiceImpl service;
    private User user;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(users, otps, refreshTokens, new UserMapper(), passwords, jwt,
                new JwtProperties("test", 900000, 604800000), new OtpProperties(true, "123456", 5, 3),
                mock(UserDocumentRepository.class), mock(DocumentStorageService.class), mock(Environment.class));
        user = User.builder().id(UUID.randomUUID()).username("existing").password("encoded")
                .enabled(true).build();
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void legacyRegistrationEndpointIsAbsent() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(users, otps, refreshTokens);
    }

    @ParameterizedTest
    @ValueSource(strings = {"verify-otp", "resend-otp"})
    void registerPurposeReturns400BeforeAccessingAccounts(String endpoint) throws Exception {
        mvc.perform(post("/api/auth/" + endpoint).contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"existing\",\"password\":\"secret\",\"code\":\"123456\",\"purpose\":\"REGISTER\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(users, otps, refreshTokens, passwords, jwt);
    }

    @Test
    void loginIssuesOnlyLoginOtpAndInvalidatesPreviousOtp() {
        when(users.findByUsername("existing")).thenReturn(Optional.of(user));
        when(passwords.matches("secret", "encoded")).thenReturn(true);
        assertNotNull(service.login(LoginRequest.builder().username(" Existing ").password("secret").build()));
        verify(otps).invalidateActive(user, OtpPurpose.LOGIN);
        verify(otps).save(argThat(otp -> otp.getPurpose() == OtpPurpose.LOGIN
                && HashUtil.sha256Matches("123456", otp.getCodeHash()) && otp.getMaxAttempts() == 3));
    }

    @Test
    void loginOtpReturnsSessionAndConsumesCodeWithoutActivatingAccount() {
        OtpVerification otp = prepareOtp();
        when(jwt.generateAccessToken(user)).thenReturn("access");
        when(jwt.generateRefreshToken(user)).thenReturn("refresh");
        var response = service.verifyOtp(verifyRequest("123456"));
        assertEquals("access", response.getAccessToken());
        assertEquals("refresh", response.getRefreshToken());
        assertTrue(otp.isUsed());
        verify(refreshTokens).save(argThat(token -> HashUtil.sha256Matches("refresh", token.getTokenHash())));
        verify(users, never()).save(any());
    }

    @Test
    void expiredOtpIsInvalidatedWithoutIssuingSession() {
        OtpVerification otp = prepareOtp();
        otp.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.verifyOtp(verifyRequest("123456")));
        assertTrue(otp.isUsed());
        verifyNoInteractions(jwt, refreshTokens);
    }

    @Test
    void wrongOtpIncrementsAttemptsAndInvalidatesAtLimit() {
        OtpVerification otp = prepareOtp();
        for (int attempt = 1; attempt <= 3; attempt++) {
            assertStatus(HttpStatus.BAD_REQUEST, () -> service.verifyOtp(verifyRequest("000000")));
            assertEquals(attempt, otp.getAttempts());
            assertEquals(attempt == 3, otp.isUsed());
        }
        verifyNoInteractions(jwt, refreshTokens);
    }

    @Test
    void exhaustedOtpIsRejectedEvenWhenCodeMatches() {
        OtpVerification otp = prepareOtp();
        otp.setAttempts(3);
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.verifyOtp(verifyRequest("123456")));
        assertTrue(otp.isUsed());
        verifyNoInteractions(jwt, refreshTokens);
    }

    @Test
    void resendLoginRequiresPasswordAndInvalidatesPreviousCode() {
        when(users.findByUsername("existing")).thenReturn(Optional.of(user));
        when(passwords.matches("secret", "encoded")).thenReturn(true);
        service.resendOtp(ResendOtpRequest.builder().username("existing").password("secret").purpose(OtpPurpose.LOGIN).build());
        verify(otps).invalidateActive(user, OtpPurpose.LOGIN);
        verify(otps).save(argThat(otp -> otp.getPurpose() == OtpPurpose.LOGIN && !otp.isUsed()));
    }

    @Test
    void resendRejectsWrongPasswordWithoutReplacingOtp() {
        when(users.findByUsername("existing")).thenReturn(Optional.of(user));
        assertStatus(HttpStatus.UNAUTHORIZED, () -> service.resendOtp(ResendOtpRequest.builder()
                .username("existing").password("wrong").purpose(OtpPurpose.LOGIN).build()));
        verifyNoInteractions(otps, jwt, refreshTokens);
    }

    @Test
    void disabledLegacyAccountsCannotBeActivatedByLoginOtp() {
        user.setEnabled(false);
        when(users.findByUsername("existing")).thenReturn(Optional.of(user));
        when(passwords.matches("secret", "encoded")).thenReturn(true);
        assertStatus(HttpStatus.FORBIDDEN, () -> service.login(LoginRequest.builder().username("existing").password("secret").build()));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.verifyOtp(verifyRequest("123456")));
        assertStatus(HttpStatus.FORBIDDEN, () -> service.resendOtp(ResendOtpRequest.builder()
                .username("existing").password("secret").purpose(OtpPurpose.LOGIN).build()));
        assertFalse(user.isEnabled());
        verifyNoInteractions(otps, jwt, refreshTokens);
        verify(users, never()).save(any());
    }

    private OtpVerification prepareOtp() {
        OtpVerification otp = OtpVerification.builder().user(user).purpose(OtpPurpose.LOGIN)
                .codeHash(HashUtil.sha256("123456")).expiresAt(LocalDateTime.now().plusMinutes(5)).maxAttempts(3).build();
        when(users.findByUsername("existing")).thenReturn(Optional.of(user));
        when(otps.findFirstByUserAndPurposeAndUsedFalseOrderByCreatedAtDesc(user, OtpPurpose.LOGIN))
                .thenReturn(Optional.of(otp));
        return otp;
    }

    private VerifyOtpRequest verifyRequest(String code) {
        return VerifyOtpRequest.builder().username("existing").code(code).purpose(OtpPurpose.LOGIN).build();
    }

    private void assertStatus(HttpStatus expected, Runnable action) {
        assertEquals(expected, assertThrows(ApiException.class, action::run).getStatus());
    }
}
