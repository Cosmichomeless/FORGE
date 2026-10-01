package com.forge.activity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Append-only. oldValue/newValue hold the enum name for status/priority changes and a user id for assignments. */
@Entity
@Table(name = "issue_activity")
public class Activity {
    @Id private UUID id;
    /** Database-assigned insertion order; entries written in one transaction share a timestamp, so this keeps the timeline stable. */
    @Column(insertable = false, updatable = false) private Long seq;
    @Column(name = "issue_id", nullable = false, updatable = false) private UUID issueId;
    @Column(name = "actor_id", nullable = false, updatable = false) private UUID actorId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false, length = 20) private ActivityType type;
    @Column(name = "old_value", updatable = false, length = 100) private String oldValue;
    @Column(name = "new_value", updatable = false, length = 100) private String newValue;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    protected Activity() {}
    public Activity(UUID issueId, UUID actorId, ActivityType type, String oldValue, String newValue, Instant createdAt) {
        this.id = UUID.randomUUID(); this.issueId = issueId; this.actorId = actorId; this.type = type;
        this.oldValue = oldValue; this.newValue = newValue; this.createdAt = createdAt;
    }
    public UUID getId() { return id; }
    public UUID getIssueId() { return issueId; }
    public UUID getActorId() { return actorId; }
    public ActivityType getType() { return type; }
    public String getOldValue() { return oldValue; }
    public String getNewValue() { return newValue; }
    public Instant getCreatedAt() { return createdAt; }
}
