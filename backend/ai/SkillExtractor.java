package com.jobtracker.backend.ai;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Extracts known technical and soft skills from resume text
 * using predefined keyword matching.
 */
@Component
public class SkillExtractor {

    // ─── Predefined skill keyword pool ───────────────────────────
    private static final List<String> KNOWN_SKILLS = List.of(
            // Programming Languages
            "java", "python", "javascript", "typescript", "c++", "c#", "go", "kotlin", "swift",
            "php", "ruby", "scala", "r",
            // Frameworks & Libraries
            "spring", "spring boot", "hibernate", "react", "angular", "vue", "node.js",
            "express", "django", "flask", "laravel", ".net",
            // Databases
            "mysql", "postgresql", "mongodb", "redis", "oracle", "sql server",
            "elasticsearch", "cassandra", "sqlite",
            // Cloud & DevOps
            "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "ci/cd",
            "terraform", "ansible", "git", "github", "gitlab",
            // Concepts & Architecture
            "rest api", "graphql", "microservices", "mvc", "oop", "tdd",
            "agile", "scrum", "design patterns", "solid principles",
            // Tools
            "maven", "gradle", "jira", "intellij", "eclipse", "postman", "linux",
            // Soft Skills
            "communication", "leadership", "teamwork", "problem solving"
    );

    /**
     * Scans the resume text and returns a list of matched skill keywords.
     *
     * @param resumeText raw text extracted from the resume file
     * @return list of skills found in the resume
     */
    public List<String> extractSkills(String resumeText) {
        if (resumeText == null || resumeText.isBlank()) {
            return new ArrayList<>();
        }

        String lowerCaseResume = resumeText.toLowerCase();
        List<String> foundSkills = new ArrayList<>();

        for (String skill : KNOWN_SKILLS) {
            if (lowerCaseResume.contains(skill.toLowerCase())) {
                // Capitalize for display (e.g., "spring boot" → "Spring Boot")
                foundSkills.add(toTitleCase(skill));
            }
        }

        return foundSkills;
    }

    // ─── Helper ──────────────────────────────────────────────────

    private String toTitleCase(String input) {
        String[] words = input.split(" ");
        StringBuilder sb = new StringBuilder();
        for (String word : words) {
            if (!word.isEmpty()) {
                sb.append(Character.toUpperCase(word.charAt(0)))
                        .append(word.substring(1))
                        .append(" ");
            }
        }
        return sb.toString().trim();
    }
}
