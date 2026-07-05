package com.jobtracker.backend.ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
@Component
public class ResumeAnalyzer {

    @Autowired
    private SkillExtractor skillExtractor;
    public int calculateScore(String resumeText) {
        if (resumeText == null || resumeText.isBlank()) return 0;

        String lower = resumeText.toLowerCase();
        int score = 0;

     
        List<String> skills = skillExtractor.extractSkills(resumeText);
        int skillScore = Math.min(skills.size() * 2, 40);
        score += skillScore;
        if (lower.contains("experience") || lower.contains("work history")) {
            score += 20;
        }


        if (lower.contains("education") || lower.contains("university") ||
                lower.contains("college") || lower.contains("degree")) {
            score += 20;
        }
        if (lower.contains("project") || lower.contains("portfolio")) {
            score += 15;
        }
        if (lower.contains("summary") || lower.contains("objective") ||
                lower.contains("profile")) {
            score += 5;
        }
        return Math.min(score, 100);
    }
    public List<String> getSuggestions(String resumeText) {
        List<String> suggestions = new ArrayList<>();

        if (resumeText == null || resumeText.isBlank()) {
            suggestions.add("Resume appears to be empty. Please upload a valid resume.");
            return suggestions;
        }

        String lower = resumeText.toLowerCase();

        // Check skills count
        List<String> skills = skillExtractor.extractSkills(resumeText);
        if (skills.size() < 5) {
            suggestions.add("Add more technical skills. Only " + skills.size() +
                    " skills detected. Aim for at least 8–10 relevant skills.");
        } else if (skills.size() < 10) {
            suggestions.add("Consider adding more skills to strengthen your profile. " +
                    "Currently detected: " + skills.size() + " skills.");
        }

        // Check for experience section
        if (!lower.contains("experience") && !lower.contains("work history")) {
            suggestions.add("Add a 'Work Experience' section with roles, companies, and dates.");
        }

        // Check for education section
        if (!lower.contains("education") && !lower.contains("university") &&
                !lower.contains("degree") && !lower.contains("college")) {
            suggestions.add("Include an 'Education' section with your degree and institution.");
        }

        // Check for projects section
        if (!lower.contains("project") && !lower.contains("portfolio")) {
            suggestions.add("Add a 'Projects' section to showcase hands-on experience.");
        }

        // Check for summary/objective
        if (!lower.contains("summary") && !lower.contains("objective") &&
                !lower.contains("profile")) {
            suggestions.add("Add a professional 'Summary' or 'Objective' at the top of your resume.");
        }

        // Check for quantified achievements
        if (!lower.matches(".*\\d+%.*") && !lower.matches(".*increased.*") &&
                !lower.matches(".*reduced.*") && !lower.matches(".*improved.*")) {
            suggestions.add("Quantify your achievements (e.g., 'Improved performance by 30%') " +
                    "to make your resume more impactful.");
        }

        // Check for contact information
        if (!lower.contains("email") && !lower.contains("phone") &&
                !lower.contains("linkedin") && !lower.contains("github")) {
            suggestions.add("Ensure your contact information (email, phone, LinkedIn/GitHub) is included.");
        }

        // If everything looks good
        if (suggestions.isEmpty()) {
            suggestions.add("Great resume! Consider tailoring it for each specific job you apply to.");
        }

        return suggestions;
    }
}
