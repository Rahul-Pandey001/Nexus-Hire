package com.jobtracker.backend.controller;

import com.jobtracker.backend.model.Resume;
import com.jobtracker.backend.service.ResumeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    @Autowired
    private ResumeService resumeService;
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
    @GetMapping("/my{id}")
    public ResponseEntity<?> getMyResume(Authentication authentication) {
        String email = authentication.getName();
        return resumeService.getResumeByUser(email)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

   
    @DeleteMapping("/my/{id}")
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
