package com.forge.issue;

import com.forge.auth.User;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class IssueDtos {
    private IssueDtos() {}
    private static String trim(String value) { return value == null ? null : value.trim(); }
    private static String blankToNull(String value) { String trimmed = trim(value); return trimmed == null || trimmed.isEmpty() ? null : trimmed; }

    public record IssueRequest(@NotBlank @Size(max = 200) String title, @Size(max = 5000) String description, IssuePriority priority, UUID assigneeId) {
        public IssueRequest { title = trim(title); description = blankToNull(description); }
    }
    public record IssueUpdateRequest(@NotBlank @Size(max = 200) String title, @Size(max = 5000) String description) {
        public IssueUpdateRequest { title = trim(title); description = blankToNull(description); }
    }
    /** A null assigneeId clears the assignment. */
    public record AssigneeRequest(UUID assigneeId) {}
    public record StatusRequest(@NotNull IssueStatus status) {}
    public record PriorityRequest(@NotNull IssuePriority priority) {}

    public record PersonResponse(UUID id, String name) {
        static PersonResponse of(User user) { return user == null ? null : new PersonResponse(user.getId(), user.getName()); }
    }
    public record IssueResponse(UUID id, UUID projectId, long number, String identifier, String title, String description,
                                IssueStatus status, IssuePriority priority, PersonResponse assignee, PersonResponse createdBy,
                                Instant createdAt, Instant updatedAt) {}
    public record IssuePage(List<IssueResponse> items, int page, int size, long totalItems, int totalPages) {}
    public enum IssueSort { NUMBER, CREATED_AT, UPDATED_AT, TITLE }
    public record DashboardIssue(UUID organizationId, String organizationName, String projectName, IssueResponse issue) {}
    public record RecentProject(UUID organizationId, String organizationName, UUID projectId, String key, String name, Instant lastActivityAt) {}
    public record DashboardResponse(List<DashboardIssue> assigned, java.util.Map<IssueStatus, Long> counts, List<RecentProject> recentProjects) {}
}
