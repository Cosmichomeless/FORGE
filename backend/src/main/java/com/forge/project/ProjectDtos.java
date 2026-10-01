package com.forge.project;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

public final class ProjectDtos {
    private ProjectDtos() {}
    static final String KEY = "^[A-Z][A-Z0-9]*$";
    private static String trim(String value) { return value == null ? null : value.trim(); }
    private static String blankToNull(String value) { String trimmed = trim(value); return trimmed == null || trimmed.isEmpty() ? null : trimmed; }

    public record ProjectRequest(
            @NotBlank @Size(min = 2, max = 10) @Pattern(regexp = KEY, message = "Use 2-10 uppercase letters or digits, starting with a letter") String key,
            @NotBlank @Size(max = 100) String name,
            @Size(max = 500) String description) {
        public ProjectRequest { key = key == null ? null : key.trim().toUpperCase(Locale.ROOT); name = trim(name); description = blankToNull(description); }
    }
    /** The key is part of every issue identifier, so it is fixed once the project exists. */
    public record ProjectUpdateRequest(@NotBlank @Size(max = 100) String name, @Size(max = 500) String description) {
        public ProjectUpdateRequest { name = trim(name); description = blankToNull(description); }
    }
    public record ProjectResponse(UUID id, UUID organizationId, String key, String name, String description, ProjectStatus status,
                                  Instant createdAt, Instant updatedAt, Instant archivedAt) {
        static ProjectResponse from(Project project) {
            return new ProjectResponse(project.getId(), project.getOrganizationId(), project.getKey(), project.getName(), project.getDescription(),
                    project.getStatus(), project.getCreatedAt(), project.getUpdatedAt(), project.getArchivedAt());
        }
    }
    public enum ProjectFilter { ACTIVE, ARCHIVED, ALL }
}
