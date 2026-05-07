package com.jobtracker.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Represents a job posting that users can track and apply to.
 */
@Entity
@Table(name = "jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @NotBlank
    @Column(nullable = false)
    private String company;

    // Full job description — used for AI resume matching
    @Column(columnDefinition = "TEXT")
    private String description;

    private String location;

    private String jobType; // Full-time, Part-time, Remote, Internship

    @Column(name = "posted_at", updatable = false)
    @Builder.Default
    private LocalDateTime postedAt = LocalDateTime.now();

    // One job can have many applications
    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Application> applications;
}
