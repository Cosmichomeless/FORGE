package com.forge.project;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project {
    @Id private UUID id;
    @Column(name = "organization_id", nullable = false, updatable = false) private UUID organizationId;
    @Column(name = "project_key", nullable = false, updatable = false, length = 10) private String key;
    @Column(nullable = false, length = 100) private String name;
    @Column(length = 500) private String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private ProjectStatus status;
    @Column(name = "created_by", nullable = false, updatable = false) private UUID createdBy;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "archived_at") private Instant archivedAt;
    @Column(name = "last_issue_number", nullable = false) private long lastIssueNumber;
    protected Project() {}
    public Project(UUID organizationId, String key, String name, String description, UUID createdBy, Instant now) {
        this.id = UUID.randomUUID(); this.organizationId = organizationId; this.key = key; this.name = name;
        this.description = description; this.createdBy = createdBy; this.createdAt = now; this.updatedAt = now;
        this.status = ProjectStatus.ACTIVE;
    }
    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public String getKey() { return key; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public ProjectStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getArchivedAt() { return archivedAt; }
    public boolean isArchived() { return status == ProjectStatus.ARCHIVED; }
    public void edit(String name, String description, Instant now) { this.name = name; this.description = description; this.updatedAt = now; }
    public void archive(Instant now) { this.status = ProjectStatus.ARCHIVED; this.archivedAt = now; this.updatedAt = now; }
    public void restore(Instant now) { this.status = ProjectStatus.ACTIVE; this.archivedAt = null; this.updatedAt = now; }

    /** Only call while holding the row lock of {@link ProjectRepository#findForUpdate}, inside the transaction that stores the issue. */
    public long allocateIssueNumber() { return ++lastIssueNumber; }
}
