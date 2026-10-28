package com.hawalati.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.otp")
public record OtpProperties(
        boolean demoEnabled,
        String demoCode,
        int expiryMinutes,
        int maxAttempts
) {
}
