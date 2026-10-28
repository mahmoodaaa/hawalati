package com.hawalati.backend.repository;

import com.hawalati.backend.entity.RefreshToken;
import com.hawalati.backend.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
    select r from RefreshToken r
    join fetch r.user
    where r.tokenHash = :tokenHash
    """)
    Optional<RefreshToken> findByTokenHash(
            @Param("tokenHash") String tokenHash
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update RefreshToken r
            set r.revoked = true
            where r.user = :user
              and r.revoked = false
            """)
    int revokeAllForUser(@Param("user") User user);
}
