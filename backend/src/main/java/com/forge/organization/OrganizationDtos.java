package com.forge.organization;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

public final class OrganizationDtos {
    private OrganizationDtos() {}
    static final String SLUG = "^[a-z0-9]+(-[a-z0-9]+)*$";
    static String lower(String value) { return value == null ? null : value.trim().toLowerCase(Locale.ROOT); }

    public record OrganizationRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(min = 2, max = 48) @Pattern(regexp = SLUG, message = "Use lowercase letters, digits and single hyphens") String slug) {
        public OrganizationRequest { name = name == null ? null : name.trim(); slug = lower(slug); }
    }
    public record OrganizationResponse(UUID id, String name, String slug, Role role, Instant createdAt) {
        static OrganizationResponse from(Organization organization, Role role) {
            return new OrganizationResponse(organization.getId(), organization.getName(), organization.getSlug(), role, organization.getCreatedAt());
        }
    }

    public record InvitationRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotNull Role role) {
        public InvitationRequest { email = lower(email); }
    }
    public record InvitationResponse(UUID id, String email, Role role, Instant createdAt, Instant expiresAt) {
        static InvitationResponse from(Invitation invitation) {
            return new InvitationResponse(invitation.getId(), invitation.getEmail(), invitation.getRole(), invitation.getCreatedAt(), invitation.getExpiresAt());
        }
    }
    /** Returned once on creation: only the hash of the token is stored. */
    public record CreatedInvitationResponse(UUID id, String email, Role role, Instant createdAt, Instant expiresAt, String token) {}
    public record AcceptInvitationRequest(@NotBlank @Size(max = 100) String token) {
        public AcceptInvitationRequest { token = token == null ? null : token.trim(); }
    }
}
