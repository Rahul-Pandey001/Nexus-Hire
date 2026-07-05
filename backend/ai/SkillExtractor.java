package com.jobtracker.backend.ai;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
@Component
public class SkillExtractor {
    private static final List<String> KNOWN_SKILLS = List.of(
            
            "java", "python", "javascript", "typescript", "c++", "c#", "go", "kotlin", "swift",
            "php", "ruby", "scala", "r",
                        "spring", "spring boot", "hibernate", "react", "angular", "vue", "node.js",
            "express", "django", "flask", "laravel", ".net",
            
            "mysql", "postgresql", "mongodb", "redis", "oracle", "sql server",
            "elasticsearch", "cassandra", "sqlite",
            
            "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "ci/cd",
            "terraform", "ansible", "git", "github", "gitlab",
            
            "rest api", "graphql", "microservices", "mvc", "oop", "tdd",
            "agile", "scrum", "design patterns", "solid principles",
            
            "maven", "gradle", "jira", "intellij", "eclipse", "postman", "linux",
           
            "communication", "leadership", "teamwork", "problem solving"
    );

    
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
