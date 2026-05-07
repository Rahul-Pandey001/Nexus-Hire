package com.jobtracker.backend.repository;

import com.jobtracker.backend.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * JPA repository for Job entity.
 * Supports search by title, company, and location.
 */
@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    // Search jobs by title (case-insensitive partial match)
    List<Job> findByTitleContainingIgnoreCase(String title);

    // Search jobs by company name
    List<Job> findByCompanyContainingIgnoreCase(String company);

    // Search by title OR company keyword
    @Query("SELECT j FROM Job j WHERE " +
            "LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(j.company) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(j.location) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Job> searchByKeyword(@Param("keyword") String keyword);
}
