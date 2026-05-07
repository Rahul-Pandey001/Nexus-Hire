package com.jobtracker.backend.service;

import com.jobtracker.backend.ai.ResumeAnalyzer;
import com.jobtracker.backend.ai.SkillExtractor;
import com.jobtracker.backend.model.Job;
import com.jobtracker.backend.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Orchestrates all AI features:
 * - Resume analysis (score + suggestions)
 * - Skill extraction
 * - Resume-to-job description matching
 */
@Service
public class AIService {

    @Autowired
    private ResumeService resumeService;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ResumeAnalyzer resumeAnalyzer;

    @Autowired
    private SkillExtractor skillExtractor;

    /**
     * Analyze the authenticated user's resume.
     * Returns:
     *  - score: integer 0–100
     *  - suggestions: list of improvement tips
     *  - extractedSkills: list of detected skills
     */
    public Map<String, Object> analyzeResume(String email) {
        // Read raw resume text
        String resumeText = resumeService.readResumeText(email);

        // Run analysis
        int score = resumeAnalyzer.calculateScore(resumeText);
        List<String> suggestions = resumeAnalyzer.getSuggestions(resumeText);
        List<String> skills = skillExtractor.extractSkills(resumeText);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("score", score);
        result.put("suggestions", suggestions);
        result.put("extractedSkills", skills);
        return result;
    }

    /**
     * Extract skills from the authenticated user's resume.
     * Returns:
     *  - skills: list of detected skill keywords
     *  - totalFound: count of detected skills
     */
    public Map<String, Object> extractSkills(String email) {
        String resumeText = resumeService.readResumeText(email);
        List<String> skills = skillExtractor.extractSkills(resumeText);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("skills", skills);
        result.put("totalFound", skills.size());
        return result;
    }

    /**
     * Match the user's resume against a specific job's description.
     * Returns:
     *  - matchPercentage: 0–100
     *  - matchedKeywords: keywords found in both resume and job description
     *  - missingKeywords: keywords in job description not found in resume
     */
    public Map<String, Object> matchResumeWithJob(String email, Long jobId) {
        // Get resume text
        String resumeText = resumeService.readResumeText(email);

        // Get job description
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found with id: " + jobId));
        String jobDescription = job.getDescription();

        // Tokenize job description into keywords (words >= 3 chars)
        String[] jobWords = jobDescription.toLowerCase().split("\\W+");
        Set<String> jobKeywords = new HashSet<>();
        for (String word : jobWords) {
            if (word.length() >= 3) jobKeywords.add(word);
        }

        // Tokenize resume
        String resumeLower = resumeText.toLowerCase();

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        for (String keyword : jobKeywords) {
            if (resumeLower.contains(keyword)) {
                matched.add(keyword);
            } else {
                missing.add(keyword);
            }
        }

        // Calculate match percentage
        int matchPercentage = jobKeywords.isEmpty() ? 0 :
                (int) ((matched.size() * 100.0) / jobKeywords.size());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("jobTitle", job.getTitle());
        result.put("company", job.getCompany());
        result.put("matchPercentage", matchPercentage);
        result.put("matchedKeywords", matched);
        result.put("missingKeywords", missing);
        return result;
    }
}
