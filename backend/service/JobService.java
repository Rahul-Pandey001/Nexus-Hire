package com.jobtracker.backend.service;

import com.jobtracker.backend.model.Job;
import com.jobtracker.backend.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Business logic for Job CRUD operations.
 */
@Service
public class JobService {

    @Autowired
    private JobRepository jobRepository;

    /**
     * Retrieve all job listings.
     */
    public List<Job> getAllJobs() {
        return jobRepository.findAll();
    }

    /**
     * Find a job by its ID.
     */
    public Optional<Job> getJobById(Long id) {
        return jobRepository.findById(id);
    }

    /**
     * Create a new job listing.
     */
    public Job createJob(Job job) {
        return jobRepository.save(job);
    }

    /**
     * Update an existing job listing.
     * Only updates non-null fields.
     */
    public Job updateJob(Long id, Job updatedJob) {
        Job existing = jobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found with id: " + id));

        // Update fields if provided
        if (updatedJob.getTitle() != null) {
            existing.setTitle(updatedJob.getTitle());
        }
        if (updatedJob.getCompany() != null) {
            existing.setCompany(updatedJob.getCompany());
        }
        if (updatedJob.getDescription() != null) {
            existing.setDescription(updatedJob.getDescription());
        }
        if (updatedJob.getLocation() != null) {
            existing.setLocation(updatedJob.getLocation());
        }

        return jobRepository.save(existing);
    }

    /**
     * Delete a job listing by ID.
     */
    public void deleteJob(Long id) {
        if (!jobRepository.existsById(id)) {
            throw new RuntimeException("Job not found with id: " + id);
        }
        jobRepository.deleteById(id);
    }
}
