package com.jobtracker.backend.controller;

import com.jobtracker.backend.service.AIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI-powered endpoints:
 * - Resume analysis (score + suggestions)
 * - Skill extraction
 * - Job description matching
 * All endpoints require JWT authentication.
 */
@RestController
@RequestMapping("/api/ai")
public class AIController {

    @Autowired
    private AIService aiService;

    /**
     * Analyze the authenticated user's resume.
     * Returns score (0-100) + improvement suggestions.
     * GET /api/ai/analyze
     */
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

    /**
     * Extract skills from the authenticated user's resume.
     * GET /api/ai/skills
     */
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

    /**
     * Match the user's resume against a job description.
     * POST /api/ai/match/{jobId}
     * Returns a match percentage and missing keywords.
     */
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