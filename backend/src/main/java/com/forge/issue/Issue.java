package com.forge.issue;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "issues")
public class Issue {
    @Id private UUID id;
    @Column(name = "project_id", nullable = false, updatable = false) private UUID projectId;
    @Column(name = "issue_number", nullable = false, updatable = false) private long number;
    @Column(nullable = false, length = 200) private String title;
    @Column(length = 5000) private String description;
    @Column(name = "created_by", nullable = false, updatable = false) private UUID createdBy;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    protected Issue() {}
    public Issue(UUID projectId, long number, String title, String description, UUID createdBy, Instant createdAt) {
        this.id = UUID.randomUUID(); this.projectId = projectId; this.number = number; this.title = title;
        this.description = description; this.createdBy = createdBy; this.createdAt = createdAt;
    }
    public UUID getId() { return id; }
    public UUID getProjectId() { return projectId; }
    public long getNumber() { return number; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Instant getCreatedAt() { return createdAt; }
}
