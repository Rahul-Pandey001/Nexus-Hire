package com.jobtracker.backend.repository;

import com.jobtracker.backend.model.Resume;
import com.jobtracker.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.List;
import java.util.Optional;

/**
 * JPA repository for Resume entity.
 */
@Repository
public interface ResumeRepository extends JpaRepository<Resume, Long> {

    // Get all resumes uploaded by a specific user
    Optional<Resume> findByUserId(Long userId);

    // Get the most recently uploaded resume for a user
    Optional<Resume> findTopByUserIdOrderByUploadedAtDesc(Long userId);
}