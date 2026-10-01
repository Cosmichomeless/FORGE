package com.forge.organization;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organizations")
public class Organization {
    @Id private UUID id;
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false, unique = true, length = 48) private String slug;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    protected Organization() {}
    public Organization(String name, String slug, Instant createdAt) {
        this.id = UUID.randomUUID(); this.name = name; this.slug = slug; this.createdAt = createdAt;
    }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public Instant getCreatedAt() { return createdAt; }
    public void rename(String name, String slug) { this.name = name; this.slug = slug; }
}
