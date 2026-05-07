package com.jobtracker.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Stores metadata about an uploaded resume file.
 * The actual file is stored on disk; filePath points to it.
 */
@Entity
@Table(name = "resumes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Many resumes belong to one user
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    // Path on the server where the resume file is stored
    @Column(name = "file_path", nullable = false)
    private String filePath;

    // Original filename for display purposes
    @Column(name = "original_filename")
    private String originalFilename;

    // Raw text extracted from the resume (used for AI analysis)
    @Column(name = "resume_text", columnDefinition = "TEXT")
    private String resumeText;

    @Column(name = "uploaded_at", updatable = false)
    @Builder.Default
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
