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
}
