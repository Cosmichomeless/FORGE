package com.forge.activity;

import com.forge.auth.User;
import com.forge.auth.UserRepository;
import com.forge.common.ApiException;
import com.forge.issue.IssueDtos.PersonResponse;
import com.forge.issue.IssueRepository;
import com.forge.organization.OrganizationService;
import com.forge.project.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import static com.forge.activity.ActivityDtos.ActivityResponse;

/** Only organization members read activity; outsiders and cross-organization ids get 404, like the issue itself. */
@Service
public class ActivityService {
    private final ActivityRepository activity;
    private final IssueRepository issues;
    private final ProjectRepository projects;
    private final OrganizationService organizations;
    private final UserRepository users;
    public ActivityService(ActivityRepository activity, IssueRepository issues, ProjectRepository projects, OrganizationService organizations, UserRepository users) {
        this.activity = activity; this.issues = issues; this.projects = projects; this.organizations = organizations; this.users = users;
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> list(UUID organizationId, UUID projectId, long number, User user) {
        organizations.requireMember(organizationId, user);
        projects.findByIdAndOrganizationId(projectId, organizationId).orElseThrow(() -> ApiException.notFound("Project not found"));
        var issue = issues.findByProjectIdAndNumber(projectId, number).orElseThrow(() -> ApiException.notFound("Issue not found"));
        List<Activity> found = activity.findByIssueIdOrderBySeqAsc(issue.getId());
        Set<UUID> ids = new HashSet<>();
        for (Activity a : found) {
            ids.add(a.getActorId());
            if (a.getType() == ActivityType.ASSIGNED) { addId(ids, a.getOldValue()); addId(ids, a.getNewValue()); }
        }
        Map<UUID, User> people = users.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return found.stream().map(a -> {
            boolean assignment = a.getType() == ActivityType.ASSIGNED;
            return new ActivityResponse(a.getId(), a.getType(), PersonResponse.of(people.get(a.getActorId())),
                    assignment ? null : a.getOldValue(), assignment ? null : a.getNewValue(),
                    assignment ? person(people, a.getOldValue()) : null, assignment ? person(people, a.getNewValue()) : null, a.getCreatedAt());
        }).toList();
    }
    private static void addId(Set<UUID> ids, String value) { if (value != null) ids.add(UUID.fromString(value)); }
    private static PersonResponse person(Map<UUID, User> people, String id) { return id == null ? null : PersonResponse.of(people.get(UUID.fromString(id))); }
}
