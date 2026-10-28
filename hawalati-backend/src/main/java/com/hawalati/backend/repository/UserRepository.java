package com.hawalati.backend.repository;

import com.hawalati.backend.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByUsername(String username);

    Optional<User> findByNationalId(String nationalId);

    Optional<User> findByPhone(String phone);

    boolean existsByUsername(String username);

    boolean existsByNationalId(String nationalId);

    boolean existsByPhone(String phone);

    boolean existsByUsernameAndIdNot(String username, UUID id);

    boolean existsByPhoneAndIdNot(String phone, UUID id);
}
