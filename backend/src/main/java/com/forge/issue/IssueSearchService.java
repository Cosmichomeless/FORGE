package com.forge.issue;

import com.forge.auth.User;
import com.forge.auth.UserRepository;
import com.forge.organization.Membership;
import com.forge.organization.MembershipRepository;
import com.forge.organization.OrganizationService;
import com.forge.project.Project;
import com.forge.project.ProjectRepository;
import com.forge.project.ProjectStatus;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import static com.forge.issue.IssueDtos.*;

/**
 * Cross-project reads. Everything is scoped to organizations the caller belongs to. The personal dashboard counts and
 * lists only issues in ACTIVE projects: archived projects are frozen history and would otherwise inflate the numbers.
 */
@Service
public class IssueSearchService {
    static final int DASHBOARD_ISSUES = 20;
    static final int DASHBOARD_PROJECTS = 5;
    private final IssueRepository issues;
    private final ProjectRepository projects;
    private final MembershipRepository memberships;
    private final OrganizationService organizations;
    private final UserRepository users;
    public IssueSearchService(IssueRepository issues, ProjectRepository projects, MembershipRepository memberships, OrganizationService organizations, UserRepository users) {
        this.issues = issues; this.projects = projects; this.memberships = memberships; this.organizations = organizations; this.users = users;
    }

    /** Searches every project of one organization by exact key or title; query is required. */
    @Transactional(readOnly = true)
    public IssuePage search(UUID organizationId, User user, String q, int page, int size) {
        organizations.requireMember(organizationId, user);
        String text = IssueSearch.clean(q);
        if (text == null) return new IssuePage(List.of(), 0, Math.min(Math.max(size, 1), IssueQueryService.MAX_PAGE_SIZE), 0, 0);
        UUID keyProject = Optional.ofNullable(IssueSearch.keyOf(text)).flatMap(key -> projects.findByOrganizationIdAndKey(organizationId, key)).map(Project::getId).orElse(null);
        Long number = IssueSearch.numberOf(text);
        Specification<Issue> spec = (root, query, cb) -> {
            Subquery<UUID> inOrganization = query.subquery(UUID.class);
            var project = inOrganization.from(Project.class);
            inOrganization.select(project.get("id")).where(cb.equal(project.get("organizationId"), organizationId));
            Predicate match = IssueSearch.match(text, keyProject, number, root, cb);
            return cb.and(root.get("projectId").in(inOrganization), match);
        };
        Sort order = Sort.by(Sort.Direction.DESC, "updatedAt").and(Sort.by(Sort.Direction.DESC, "id"));
        Page<Issue> found = issues.findAll(spec, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), IssueQueryService.MAX_PAGE_SIZE), order));
        Map<UUID, Project> byId = projects.findAllById(found.getContent().stream().map(Issue::getProjectId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Project::getId, Function.identity()));
        Map<UUID, User> people = people(found.getContent());
        List<IssueResponse> items = found.getContent().stream().map(i -> IssueQueryService.toResponse(i, byId.get(i.getProjectId()), people)).toList();
        return new IssuePage(items, found.getNumber(), found.getSize(), found.getTotalElements(), found.getTotalPages());
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(User user) {
        List<Membership> mine = memberships.findAllForUser(user.getId());
        Map<UUID, String> organizationNames = new HashMap<>();
        Map<UUID, Project> active = new LinkedHashMap<>();
        for (Membership m : mine) {
            organizationNames.put(m.getOrganizationId(), m.getOrganization().getName());
            for (Project p : projects.findAllInOrganizationWithStatus(m.getOrganizationId(), ProjectStatus.ACTIVE)) active.put(p.getId(), p);
        }
        Map<IssueStatus, Long> counts = new EnumMap<>(IssueStatus.class);
        for (IssueStatus s : IssueStatus.values()) counts.put(s, 0L);
        if (active.isEmpty()) return new DashboardResponse(List.of(), counts, List.of());
        Set<UUID> ids = active.keySet();
        for (Object[] row : issues.countByStatusAssignedTo(user.getId(), ids)) counts.put((IssueStatus) row[0], (Long) row[1]);

        Specification<Issue> open = (root, query, cb) -> cb.and(cb.equal(root.get("assigneeId"), user.getId()), root.get("projectId").in(ids), cb.notEqual(root.get("status"), IssueStatus.DONE));
        List<Issue> assigned = issues.findAll(open, PageRequest.of(0, DASHBOARD_ISSUES, Sort.by(Sort.Direction.DESC, "updatedAt").and(Sort.by(Sort.Direction.DESC, "id")))).getContent();
        Map<UUID, User> people = people(assigned);
        List<DashboardIssue> items = assigned.stream().map(i -> {
            Project p = active.get(i.getProjectId());
            return new DashboardIssue(p.getOrganizationId(), organizationNames.get(p.getOrganizationId()), p.getName(), IssueQueryService.toResponse(i, p, people));
        }).toList();
        List<RecentProject> recent = issues.recentProjects(ids, PageRequest.of(0, DASHBOARD_PROJECTS)).stream().map(row -> {
            Project p = active.get((UUID) row[0]);
            return new RecentProject(p.getOrganizationId(), organizationNames.get(p.getOrganizationId()), p.getId(), p.getKey(), p.getName(), (java.time.Instant) row[1]);
        }).toList();
        return new DashboardResponse(items, counts, recent);
    }

    private Map<UUID, User> people(Collection<Issue> found) {
        Set<UUID> ids = new HashSet<>();
        for (Issue issue : found) { ids.add(issue.getCreatedBy()); if (issue.getAssigneeId() != null) ids.add(issue.getAssigneeId()); }
        return users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
    }
}
