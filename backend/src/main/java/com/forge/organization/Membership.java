package com.forge.organization;

import com.forge.auth.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "memberships")
public class Membership {
    @Id private UUID id;
    @Column(name = "organization_id", nullable = false, updatable = false) private UUID organizationId;
    @Column(name = "user_id", nullable = false, updatable = false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private Role role;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "organization_id", insertable = false, updatable = false) private Organization organization;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", insertable = false, updatable = false) private User user;
    protected Membership() {}
    public Membership(UUID organizationId, UUID userId, Role role, Instant createdAt) {
        this.id = UUID.randomUUID(); this.organizationId = organizationId; this.userId = userId; this.role = role; this.createdAt = createdAt;
    }
    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public UUID getUserId() { return userId; }
    public Role getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
    public Organization getOrganization() { return organization; }
    public User getUser() { return user; }
    public void changeRole(Role role) { this.role = role; }
}
