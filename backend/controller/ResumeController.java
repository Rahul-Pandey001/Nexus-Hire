package com.jobtracker.backend.controller;

import com.jobtracker.backend.model.Resume;
import com.jobtracker.backend.service.ResumeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Handles resume upload and retrieval for the authenticated user.
 * All endpoints require JWT authentication.
 */
@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    @Autowired
    private ResumeService resumeService;

    /**
     * Upload a resume file.
     * POST /api/resumes/upload
     * Accepts multipart/form-data with key "file"
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadResume(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Resume resume = resumeService.uploadResume(file, email);
            return ResponseEntity.ok(Map.of(
                    "message", "Resume uploaded successfully",
                    "resumeId", resume.getId(),
                    "filePath", resume.getFilePath()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get the currently logged-in user's resume info.
     * GET /api/resumes/my
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyResume(Authentication authentication) {
        String email = authentication.getName();
        return resumeService.getResumeByUser(email)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete the currently logged-in user's resume.
     * DELETE /api/resumes/my
     */
    @DeleteMapping("/my")
    public ResponseEntity<?> deleteMyResume(Authentication authentication) {
        try {
            String email = authentication.getName();
            resumeService.deleteResume(email);
            return ResponseEntity.ok(Map.of("message", "Resume deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
