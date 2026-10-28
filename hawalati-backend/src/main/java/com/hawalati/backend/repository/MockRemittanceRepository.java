package com.hawalati.backend.repository;

import com.hawalati.backend.entity.MockRemittance;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface MockRemittanceRepository extends JpaRepository<MockRemittance, UUID> {
    Optional<MockRemittance> findByReferenceNumberIgnoreCase(String referenceNumber);
    boolean existsByReferenceNumber(String referenceNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from MockRemittance r where r.id = :id")
    Optional<MockRemittance> findByIdForUpdate(@Param("id") UUID id);
}
