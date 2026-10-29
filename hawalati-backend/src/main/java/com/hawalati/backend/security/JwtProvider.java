package com.hawalati.backend.security;

import com.hawalati.backend.config.JwtProperties;
import com.hawalati.backend.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";
    public static final String TOKEN_TYPE_REGISTRATION = "registration";

    private final JwtProperties jwtProperties;
    private final SecretKey signingKey;

    public JwtProvider(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.signingKey = buildSigningKey(jwtProperties.secret());
    }

    public String generateAccessToken(User user) {
        return generateToken(user, jwtProperties.accessTokenExpiration(), TOKEN_TYPE_ACCESS);
    }

    public String generateRefreshToken(User user) {
        return generateToken(user, jwtProperties.refreshTokenExpiration(), TOKEN_TYPE_REFRESH);
    }


    public String generateRegistrationToken(String phone) {
        Date now = new Date();

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(phone)
                .claim("type", TOKEN_TYPE_REGISTRATION)
                .claim("purpose", "REGISTRATION")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + 15 * 60 * 1000L))
                .signWith(signingKey)
                .compact();
    }

    public String validateRegistrationToken(String token) {
        Claims claims = parseClaims(token);

        if (!TOKEN_TYPE_REGISTRATION.equals(
                claims.get("type", String.class))
                || !"REGISTRATION".equals(
                claims.get("purpose", String.class))) {
            throw new IllegalArgumentException(
                    "Invalid registration token"
            );
        }

        String phone = claims.getSubject();

        if (phone == null || phone.isBlank()) {
            throw new IllegalArgumentException(
                    "Registration phone is missing"
            );
        }

        return phone;
    }



    public UUID extractUserId(String token) {
        return UUID.fromString(parseClaims(token).getSubject());
    }

    public String extractType(String token) {
        Object type = parseClaims(token).get("type");
        return type == null ? null : type.toString();
    }

    public boolean isAccessToken(String token) {
        return TOKEN_TYPE_ACCESS.equals(extractType(token));
    }

    public boolean isRefreshToken(String token) {
        return TOKEN_TYPE_REFRESH.equals(extractType(token));
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String describeValidationError(String token) {
        try {
            parseClaims(token);
            return null;
        } catch (ExpiredJwtException ex) {
            return "انتهت صلاحية الجلسة";
        } catch (JwtException | IllegalArgumentException ex) {
            return "رمز الدخول غير صالح";
        }
    }

    private String generateToken(User user, long expirationMs, String type) {
        Date now = new Date();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(user.getId().toString())
                .claim("type", type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(signingKey)
                .compact();
    }




    private SecretKey buildSigningKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is required");
        }
        try {
            byte[] keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }
}
