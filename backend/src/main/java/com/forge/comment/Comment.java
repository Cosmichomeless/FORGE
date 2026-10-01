package com.forge.comment;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "comments")
public class Comment {
    @Id private UUID id;
    @Column(name = "issue_id", nullable = false, updatable = false) private UUID issueId;
    @Column(name = "author_id", nullable = false, updatable = false) private UUID authorId;
    @Column(nullable = false, length = 5000) private String body;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    protected Comment() {}
    public Comment(UUID issueId, UUID authorId, String body, Instant now) {
        this.id = UUID.randomUUID(); this.issueId = issueId; this.authorId = authorId; this.body = body; this.createdAt = now; this.updatedAt = now;
    }
    public void edit(String body, Instant now) { this.body = body; this.updatedAt = now; }
    public UUID getId() { return id; }
    public UUID getIssueId() { return issueId; }
    public UUID getAuthorId() { return authorId; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
