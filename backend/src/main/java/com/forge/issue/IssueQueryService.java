package com.forge.issue;

import com.forge.auth.User;
import com.forge.auth.UserRepository;
import com.forge.common.ApiException;
import com.forge.organization.MembershipRepository;
import com.forge.organization.OrganizationService;
import com.forge.project.Project;
import com.forge.project.ProjectRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import static com.forge.issue.IssueDtos.*;

/**
 * HTTP-facing issue operations. Every call first resolves the caller's membership in the URL's organization and the
 * project inside that organization, so outsiders and cross-organization ids both get 404. Any member may read and
 * change issues; archived projects are read-only.
 */
@Service
public class IssueQueryService {
    public static final int MAX_PAGE_SIZE = 100;
    private final ProjectRepository projects;
    private final IssueRepository issues;
    private final IssueService numbering;
    private final OrganizationService organizations;
    private final MembershipRepository memberships;
    private final UserRepository users;
    private final Clock clock;
    public IssueQueryService(ProjectRepository projects, IssueRepository issues, IssueService numbering, OrganizationService organizations,
                             MembershipRepository memberships, UserRepository users, Clock clock) {
        this.projects = projects; this.issues = issues; this.numbering = numbering; this.organizations = organizations;
        this.memberships = memberships; this.users = users; this.clock = clock;
    }

    @Transactional
    public IssueResponse create(UUID organizationId, UUID projectId, User user, IssueRequest input) {
        organizations.requireMember(organizationId, user);
        // Do not load the Project entity before IssueService locks it: a cached copy would carry a stale issue counter.
        if (!projects.existsByIdAndOrganizationId(projectId, organizationId)) throw ApiException.notFound("Project not found");
        if (input.assigneeId() != null) requireAssignable(organizationId, input.assigneeId());
        var created = numbering.create(projectId, user.getId(), input.title(), input.description());
        Issue issue = issues.findById(created.id()).orElseThrow();
        Instant now = Instant.now(clock);
        if (input.priority() != null) issue.changePriority(input.priority(), now);
        if (input.assigneeId() != null) issue.assignTo(input.assigneeId(), now);
        return respond(issue, projects.findById(projectId).orElseThrow());
    }

    @Transactional(readOnly = true)
    public IssuePage list(UUID organizationId, UUID projectId, User user, int page, int size, IssueSort sort, boolean descending,
                          IssueStatus status, IssuePriority priority, UUID assigneeId, boolean unassigned) {
        organizations.requireMember(organizationId, user);
        Project project = requireProject(organizationId, projectId);
        Specification<Issue> spec = (root, query, cb) -> {
            List<Predicate> all = new ArrayList<>();
            all.add(cb.equal(root.get("projectId"), projectId));
            if (status != null) all.add(cb.equal(root.get("status"), status));
            if (priority != null) all.add(cb.equal(root.get("priority"), priority));
            if (unassigned) all.add(cb.isNull(root.get("assigneeId")));
            else if (assigneeId != null) all.add(cb.equal(root.get("assigneeId"), assigneeId));
            return cb.and(all.toArray(Predicate[]::new));
        };
        String property = switch (sort) { case NUMBER -> "number"; case CREATED_AT -> "createdAt"; case UPDATED_AT -> "updatedAt"; case TITLE -> "title"; };
        Sort.Direction direction = descending ? Sort.Direction.DESC : Sort.Direction.ASC;
        // The number is unique per project, so appending it makes the order total and pages never overlap or skip rows.
        Sort order = Sort.by(direction, property).and(Sort.by(direction, "number"));
        Page<Issue> found = issues.findAll(spec, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), order));
        Map<UUID, User> people = loadPeople(found.getContent());
        List<IssueResponse> items = found.getContent().stream().map(i -> toResponse(i, project, people)).toList();
        return new IssuePage(items, found.getNumber(), found.getSize(), found.getTotalElements(), found.getTotalPages());
    }

    @Transactional(readOnly = true)
    public IssueResponse get(UUID organizationId, UUID projectId, long number, User user) {
        organizations.requireMember(organizationId, user);
        Project project = requireProject(organizationId, projectId);
        return respond(find(projectId, number), project);
    }

    @Transactional
    public IssueResponse edit(UUID organizationId, UUID projectId, long number, User user, IssueUpdateRequest input) {
        Issue issue = writable(organizationId, projectId, number, user);
        issue.edit(input.title(), input.description(), Instant.now(clock));
        return respond(issue, projects.findById(projectId).orElseThrow());
    }

    @Transactional
    public IssueResponse assign(UUID organizationId, UUID projectId, long number, User user, AssigneeRequest input) {
        Issue issue = writable(organizationId, projectId, number, user);
        if (input.assigneeId() != null) requireAssignable(organizationId, input.assigneeId());
        issue.assignTo(input.assigneeId(), Instant.now(clock));
        return respond(issue, projects.findById(projectId).orElseThrow());
    }

    @Transactional
    public IssueResponse changeStatus(UUID organizationId, UUID projectId, long number, User user, StatusRequest input) {
        Issue issue = writable(organizationId, projectId, number, user);
        issue.changeStatus(input.status(), Instant.now(clock));
        return respond(issue, projects.findById(projectId).orElseThrow());
    }

    @Transactional
    public IssueResponse changePriority(UUID organizationId, UUID projectId, long number, User user, PriorityRequest input) {
        Issue issue = writable(organizationId, projectId, number, user);
        issue.changePriority(input.priority(), Instant.now(clock));
        return respond(issue, projects.findById(projectId).orElseThrow());
    }

    private Issue writable(UUID organizationId, UUID projectId, long number, User user) {
        organizations.requireMember(organizationId, user);
        Project project = requireProject(organizationId, projectId);
        if (project.isArchived()) throw ApiException.conflict("Archived projects are read-only; restore the project first");
        return find(projectId, number);
    }
    private Project requireProject(UUID organizationId, UUID projectId) {
        return projects.findByIdAndOrganizationId(projectId, organizationId).orElseThrow(() -> ApiException.notFound("Project not found"));
    }
    private Issue find(UUID projectId, long number) {
        return issues.findByProjectIdAndNumber(projectId, number).orElseThrow(() -> ApiException.notFound("Issue not found"));
    }
    private void requireAssignable(UUID organizationId, UUID assigneeId) {
        if (!memberships.existsByOrganizationIdAndUserId(organizationId, assigneeId))
            throw new ApiException(400, "Assignee must be a member of the organization", Map.of("assigneeId", "Assignee must be a member of the organization"));
    }
    private Map<UUID, User> loadPeople(Collection<Issue> found) {
        Set<UUID> ids = new HashSet<>();
        for (Issue issue : found) { ids.add(issue.getCreatedBy()); if (issue.getAssigneeId() != null) ids.add(issue.getAssigneeId()); }
        return users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
    }
    private IssueResponse respond(Issue issue, Project project) { return toResponse(issue, project, loadPeople(List.of(issue))); }
    private static IssueResponse toResponse(Issue issue, Project project, Map<UUID, User> people) {
        return new IssueResponse(issue.getId(), issue.getProjectId(), issue.getNumber(), project.getKey() + "-" + issue.getNumber(),
                issue.getTitle(), issue.getDescription(), issue.getStatus(), issue.getPriority(),
                PersonResponse.of(people.get(issue.getAssigneeId())), PersonResponse.of(people.get(issue.getCreatedBy())),
                issue.getCreatedAt(), issue.getUpdatedAt());
    }
}
