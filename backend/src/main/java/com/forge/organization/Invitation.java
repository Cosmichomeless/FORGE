package com.forge.organization;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitations")
public class Invitation {
    @Id private UUID id;
    @Column(name = "organization_id", nullable = false, updatable = false) private UUID organizationId;
    @Column(nullable = false, updatable = false, length = 254) private String email;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false, length = 10) private Role role;
    @Column(name = "token_hash", nullable = false, updatable = false, length = 64) private String tokenHash;
    @Column(name = "invited_by", nullable = false, updatable = false) private UUID invitedBy;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "expires_at", nullable = false, updatable = false) private Instant expiresAt;
    @Column(name = "accepted_at") private Instant acceptedAt;
    @Column(name = "accepted_by") private UUID acceptedBy;
    protected Invitation() {}
    public Invitation(UUID organizationId, String email, Role role, String tokenHash, UUID invitedBy, Instant createdAt, Instant expiresAt) {
        this.id = UUID.randomUUID(); this.organizationId = organizationId; this.email = email; this.role = role;
        this.tokenHash = tokenHash; this.invitedBy = invitedBy; this.createdAt = createdAt; this.expiresAt = expiresAt;
    }
    public UUID getId() { return id; }
    public UUID getOrganizationId() { return organizationId; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isAccepted() { return acceptedAt != null; }
    public boolean isExpired(Instant now) { return !expiresAt.isAfter(now); }
    public void accept(UUID userId, Instant now) { this.acceptedAt = now; this.acceptedBy = userId; }
}
