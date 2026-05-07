package com.jobtracker.backend.controller;
import com.jobtracker.backend.model.Application;
import com.jobtracker.backend.service.ApplicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {
    @Autowired
    private ApplicationService applicationService;
    @GetMapping
    public ResponseEntity<List<Application>> getMyApplications(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(applicationService.getApplicationsByUser(email));
    }
    @PostMapping("/apply")
    public ResponseEntity<?> applyToJob(
            @RequestBody Map<String, Long> body,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Long jobId = body.get("jobId");
            Application application = applicationService.applyToJob(email, jobId);
            return ResponseEntity.ok(application);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            String status = body.get("status");
            Application updated = applicationService.updateStatus(id, status, email);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteApplication(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            applicationService.deleteApplication(id, email);
            return ResponseEntity.ok(Map.of("message", "Application withdrawn successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
