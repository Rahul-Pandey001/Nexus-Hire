package com.jobtracker.backend.service;

import com.jobtracker.backend.model.Resume;
import com.jobtracker.backend.model.User;
import com.jobtracker.backend.repository.ResumeRepository;
import com.jobtracker.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles resume file upload, retrieval, and deletion.
 * Files are stored in the local filesystem under /uploads/resumes/
 */
@Service
public class ResumeService {

    // Directory where resume files will be stored
    private static final String UPLOAD_DIR = "uploads/resumes/";

    @Autowired
    private ResumeRepository resumeRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Upload a resume file for the authenticated user.
     * - Accepts PDF and DOCX files only
     * - Stores file on disk
     * - Saves file path in DB (one resume per user)
     */
    public Resume uploadResume(MultipartFile file, String email) {
        // Validate file type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null ||
                (!originalFilename.endsWith(".pdf") && !originalFilename.endsWith(".docx"))) {
            throw new RuntimeException("Only PDF and DOCX files are allowed.");
        }

        User user = getUserByEmail(email);

        try {
            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename to avoid collisions
            String uniqueFilename = UUID.randomUUID() + "_" + originalFilename;
            Path filePath = uploadPath.resolve(uniqueFilename);
            file.transferTo(filePath.toFile());

            // Delete existing resume record if user already has one
            resumeRepository.findByUserId(user.getId()).ifPresent(existing -> {
                // Delete old file from disk
                File oldFile = new File(existing.getFilePath());
                if (oldFile.exists()) oldFile.delete();
                resumeRepository.delete(existing);
            });

            // Save new resume record
            Resume resume = new Resume();
            resume.setUser(user);
            resume.setFilePath(filePath.toString());

            return resumeRepository.save(resume);

        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + e.getMessage());
        }
    }

    /**
     * Retrieve the resume record for the authenticated user.
     */
    public Optional<Resume> getResumeByUser(String email) {
        User user = getUserByEmail(email);
        return resumeRepository.findByUserId(user.getId());
    }

    /**
     * Delete the authenticated user's resume (DB record + file on disk).
     */
    public void deleteResume(String email) {
        User user = getUserByEmail(email);
        Resume resume = resumeRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("No resume found for user: " + email));

        // Delete physical file
        File file = new File(resume.getFilePath());
        if (file.exists()) file.delete();

        resumeRepository.delete(resume);
    }

    /**
     * Read the text content of a resume file (used by AI services).
     * Only works for text-based content; PDF/DOCX parsing can be extended here.
     */
    public String readResumeText(String email) {
        Resume resume = getResumeByUser(email)
                .orElseThrow(() -> new RuntimeException("No resume found. Please upload a resume first."));

        try {
            Path filePath = Paths.get(resume.getFilePath());
            // For plain text files; extend with Apache PDFBox/POI for PDF/DOCX
            return Files.readString(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Could not read resume file: " + e.getMessage());
        }
    }

    // ─── Helper Methods ───────────────────────────────────────────

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }
}
