package com.hawalati.backend.repository;

import com.hawalati.backend.entity.OtpVerification;
import com.hawalati.backend.entity.User;
import com.hawalati.backend.enums.OtpPurpose;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OtpVerification>
                findFirstByUserAndPurposeAndUsedFalseOrderByCreatedAtDesc(User user, OtpPurpose purpose);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update OtpVerification o
            set o.used = true
            where o.user = :user
              and o.purpose = :purpose
              and o.used = false
            """)
    int invalidateActive(@Param("user") User user, @Param("purpose") OtpPurpose purpose);
}
