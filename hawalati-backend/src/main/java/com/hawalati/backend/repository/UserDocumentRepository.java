package com.hawalati.backend.repository;

import com.hawalati.backend.entity.UserDocument;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserDocumentRepository extends JpaRepository<UserDocument, UUID> {

    Optional<UserDocument> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);
}
