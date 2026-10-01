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
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) private IssueStatus status;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private IssuePriority priority;
    @Column(name = "assignee_id") private UUID assigneeId;
    @Column(name = "created_by", nullable = false, updatable = false) private UUID createdBy;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Issue() {}
    public Issue(UUID projectId, long number, String title, String description, UUID createdBy, Instant createdAt) {
        this.id = UUID.randomUUID(); this.projectId = projectId; this.number = number; this.title = title;
        this.description = description; this.createdBy = createdBy; this.createdAt = createdAt; this.updatedAt = createdAt;
        this.status = IssueStatus.TODO; this.priority = IssuePriority.MEDIUM;
    }
    /** Only content fields change here; project, number and creator are fixed for the life of the issue. */
    public void edit(String title, String description, Instant now) { this.title = title; this.description = description; this.updatedAt = now; }
    public void assignTo(UUID assigneeId, Instant now) { this.assigneeId = assigneeId; this.updatedAt = now; }
    public void changeStatus(IssueStatus status, Instant now) { this.status = status; this.updatedAt = now; }
    public void changePriority(IssuePriority priority, Instant now) { this.priority = priority; this.updatedAt = now; }
    public UUID getId() { return id; }
    public UUID getProjectId() { return projectId; }
    public long getNumber() { return number; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public IssueStatus getStatus() { return status; }
    public IssuePriority getPriority() { return priority; }
    public UUID getAssigneeId() { return assigneeId; }
    public UUID getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
