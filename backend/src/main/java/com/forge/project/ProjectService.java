package com.forge.project;

import com.forge.auth.User;
import com.forge.common.ApiException;
import com.forge.organization.Membership;
import com.forge.organization.OrganizationService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import static com.forge.project.ProjectDtos.*;

/**
 * Projects live inside an organization. Anyone in the organization may read them (archived ones included);
 * creating, editing, archiving and restoring require OWNER or ADMIN. Outsiders get 404, never a hint that a project exists.
 */
@Service
public class ProjectService {
    private final ProjectRepository projects;
    private final OrganizationService organizations;
    private final Clock clock;
    public ProjectService(ProjectRepository projects, OrganizationService organizations, Clock clock) {
        this.projects = projects; this.organizations = organizations; this.clock = clock;
    }

    @Transactional
    public ProjectResponse create(UUID organizationId, User user, ProjectRequest input) {
        requireManager(organizationId, user);
        if (projects.existsByOrganizationIdAndKey(organizationId, input.key())) throw keyTaken();
        try {
            return ProjectResponse.from(projects.saveAndFlush(
                    new Project(organizationId, input.key(), input.name(), input.description(), user.getId(), Instant.now(clock))));
        } catch (DataIntegrityViolationException ex) {
            throw keyTaken();
        }
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> list(UUID organizationId, User user, ProjectFilter filter) {
        organizations.requireMember(organizationId, user);
        List<Project> found = switch (filter) {
            case ALL -> projects.findAllInOrganization(organizationId);
            case ACTIVE -> projects.findAllInOrganizationWithStatus(organizationId, ProjectStatus.ACTIVE);
            case ARCHIVED -> projects.findAllInOrganizationWithStatus(organizationId, ProjectStatus.ARCHIVED);
        };
        return found.stream().map(ProjectResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(UUID organizationId, UUID projectId, User user) {
        organizations.requireMember(organizationId, user);
        return ProjectResponse.from(projects.findByIdAndOrganizationId(projectId, organizationId).orElseThrow(ProjectService::missing));
    }

    @Transactional
    public ProjectResponse update(UUID organizationId, UUID projectId, User user, ProjectUpdateRequest input) {
        requireManager(organizationId, user);
        Project project = lock(organizationId, projectId);
        if (project.isArchived()) throw ApiException.conflict("Archived projects cannot be edited; restore it first");
        project.edit(input.name(), input.description(), Instant.now(clock));
        return ProjectResponse.from(project);
    }

    /** Archiving keeps every row; calling it on an archived project changes nothing. */
    @Transactional
    public ProjectResponse archive(UUID organizationId, UUID projectId, User user) {
        requireManager(organizationId, user);
        Project project = lock(organizationId, projectId);
        if (!project.isArchived()) project.archive(Instant.now(clock));
        return ProjectResponse.from(project);
    }

    @Transactional
    public ProjectResponse restore(UUID organizationId, UUID projectId, User user) {
        requireManager(organizationId, user);
        Project project = lock(organizationId, projectId);
        if (project.isArchived()) project.restore(Instant.now(clock));
        return ProjectResponse.from(project);
    }

    private void requireManager(UUID organizationId, User user) {
        Membership membership = organizations.requireMember(organizationId, user);
        OrganizationService.requireManager(membership);
    }
    private Project lock(UUID organizationId, UUID projectId) {
        Project project = projects.findForUpdate(projectId).orElseThrow(ProjectService::missing);
        if (!project.getOrganizationId().equals(organizationId)) throw missing();
        return project;
    }
    private static ApiException missing() { return ApiException.notFound("Project not found"); }
    private static ApiException keyTaken() { return ApiException.conflict("Key already in use in this organization", "key"); }
}
