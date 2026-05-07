package com.jobtracker.backend.service;

import com.jobtracker.backend.model.Application;
import com.jobtracker.backend.model.Job;
import com.jobtracker.backend.model.User;
import com.jobtracker.backend.repository.ApplicationRepository;
import com.jobtracker.backend.repository.JobRepository;
import com.jobtracker.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
@Service
public class ApplicationService {

    @Autowired
    private ApplicationRepository applicationRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JobRepository jobRepository;

    public List<Application> getApplicationsByUser(String email) {
        User user = getUserByEmail(email);
        return applicationRepository.findByUserId(user.getId());
    }
    public Application applyToJob(String email, Long jobId) {
        User user = getUserByEmail(email);
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found with id: " + jobId));

        boolean alreadyApplied = applicationRepository
                .findByUserIdAndJobId(user.getId(), job.getId())
                .isPresent();
        if (alreadyApplied) {
            throw new RuntimeException("You have already applied to this job.");
        }
        Application application = new Application();
        application.setUser(user);
        application.setJob(job);
        application.setStatus(Application.ApplicationStatus.APPLIED);
        application.setAppliedDate(LocalDate.now());
        return applicationRepository.save(application);
    }
    public Application updateStatus(Long applicationId, String status, String email) {
        validateStatus(status);
        User user = getUserByEmail(email);
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + applicationId));
        if (!application.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: This application does not belong to you.");
        }
        application.setStatus(Application.ApplicationStatus.valueOf(status.toUpperCase()));
        return applicationRepository.save(application);
    }

    public void deleteApplication(Long applicationId, String email) {
        User user = getUserByEmail(email);
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found with id: " + applicationId));
        if (!application.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: This application does not belong to you.");
        }
        applicationRepository.delete(application);
    }
    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }
    private void validateStatus(String status) {
        List<String> validStatuses = List.of("APPLIED", "INTERVIEW", "REJECTED", "OFFER");
        if (!validStatuses.contains(status.toUpperCase())) {
            throw new RuntimeException("Invalid status: " + status +
                    ". Valid values are: APPLIED, INTERVIEW, REJECTED, OFFER");
        }
    }
}