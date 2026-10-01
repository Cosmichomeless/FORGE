package com.forge.issue;

import com.forge.common.ApiException;
import com.forge.project.Project;
import com.forge.project.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * Issue numbers (FORGE-1, FORGE-2, ...) come from a counter on the project row, advanced while that row is locked
 * and in the same transaction that stores the issue. Concurrent creations queue on the lock, so numbers are
 * distinct and gap-free (a rolled-back creation rolls the counter back too); MAX(number)+1 is never used.
 * Callers must have authorized the user against the project's organization before calling.
 */
@Service
public class IssueService {
    public record CreatedIssue(UUID id, UUID projectId, long number, String identifier, String title) {}

    private final ProjectRepository projects;
    private final IssueRepository issues;
    private final Clock clock;
    public IssueService(ProjectRepository projects, IssueRepository issues, Clock clock) {
        this.projects = projects; this.issues = issues; this.clock = clock;
    }

    @Transactional
    public CreatedIssue create(UUID projectId, UUID createdBy, String title, String description) {
        Project project = projects.findForUpdate(projectId).orElseThrow(() -> ApiException.notFound("Project not found"));
        if (project.isArchived()) throw ApiException.conflict("Archived projects do not accept new issues");
        Issue issue = issues.saveAndFlush(new Issue(projectId, project.allocateIssueNumber(), title, description, createdBy, Instant.now(clock)));
        return new CreatedIssue(issue.getId(), projectId, issue.getNumber(), project.getKey() + "-" + issue.getNumber(), issue.getTitle());
    }
}
