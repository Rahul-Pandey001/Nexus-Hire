package com.jobtracker.backend.controller;

import com.jobtracker.backend.service.AIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private AIService aiService;
    @GetMapping("/analyze")
    public ResponseEntity<?> analyzeResume(Authentication authentication) {
        try {
            String email = authentication.getName();
            Map<String, Object> result = aiService.analyzeResume(email);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @GetMapping("/skills")
    public ResponseEntity<?> extractSkills(Authentication authentication) {
        try {
            String email = authentication.getName();
            Map<String, Object> result = aiService.extractSkills(email);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    
    @PostMapping("/match/{jobId}")
    public ResponseEntity<?> matchWithJob(
            @PathVariable Long jobId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Map<String, Object> result = aiService.matchResumeWithJob(email, jobId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
