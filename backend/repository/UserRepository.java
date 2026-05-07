package com.jobtracker.backend.repository;

import com.jobtracker.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * JPA repository for User entity.
 * Provides CRUD + email lookup operations.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Used during login to look up user by email
    Optional<User> findByEmail(String email);

    // Check if email already registered (used during registration)
    boolean existsByEmail(String email);
}
