package com.jobtracker.backend.repository;

import com.jobtracker.backend.model.Application;
import com.jobtracker.backend.model.Application.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    // Get all applications submitted by a specific user
    List<Application> findByUserId(Long userId);

    // Filter user's applications by status
    List<Application> findByUserIdAndStatus(Long userId, ApplicationStatus status);

    // Check if user already applied to this job (prevent duplicates)
    Optional<Application> findByUserIdAndJobId(Long userId, Long jobId);

    // Count applications per status for a user (used in dashboard analytics)
    long countByUserIdAndStatus(Long userId, ApplicationStatus status);
}
