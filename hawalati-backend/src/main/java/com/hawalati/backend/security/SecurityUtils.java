package com.hawalati.backend.security;

import com.hawalati.backend.entity.User;
import com.hawalati.backend.exception.ApiException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static UUID currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user) || user.getId() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "يجب تسجيل الدخول أولاً");
        }
        return user.getId();
    }
}
