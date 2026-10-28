package com.hawalati.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.hawalati.backend.config.JwtProperties;
import com.hawalati.backend.entity.User;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JwtProviderTest {

    private JwtProvider jwtProvider;
    private User user;

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider(new JwtProperties(
                "hawalati-test-secret-key-32chars-min",
                900_000L,
                604_800_000L
        ));
        user = User.builder()
                .id(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .username("ahmad.omari")
                .enabled(true)
                .build();
    }

    @Test
    void accessTokenUsesUserIdAndAccessType() {
        String token = jwtProvider.generateAccessToken(user);

        assertEquals(user.getId(), jwtProvider.extractUserId(token));
        assertTrue(jwtProvider.isAccessToken(token));
        assertFalse(jwtProvider.isRefreshToken(token));
    }

    @Test
    void refreshTokenIsRejectedAsAccessToken() {
        String token = jwtProvider.generateRefreshToken(user);

        assertTrue(jwtProvider.isRefreshToken(token));
        assertFalse(jwtProvider.isAccessToken(token));
    }

    @Test
    void shortSecretStillCreatesValidAccessToken() {
        JwtProvider shortSecretProvider = new JwtProvider(new JwtProperties("short-dev-secret", 900_000L, 604_800_000L));
        String token = shortSecretProvider.generateAccessToken(user);

        assertEquals(user.getId(), shortSecretProvider.extractUserId(token));
        assertTrue(shortSecretProvider.isAccessToken(token));
    }

    @Test
    void missingSecretFailsFast() {
        assertThrows(IllegalStateException.class, () -> new JwtProvider(new JwtProperties("   ", 1L, 1L)));
    }
}
