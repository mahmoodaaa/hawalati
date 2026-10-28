package com.hawalati.backend.repository;

import com.hawalati.backend.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    boolean existsByRemittanceId(UUID remittanceId);
    List<Transaction> findByUserIdOrderByConfirmedAtDesc(UUID userId);
}
