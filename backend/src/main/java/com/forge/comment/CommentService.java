package com.forge.comment;

import com.forge.activity.ActivityRecorder;
import com.forge.activity.ActivityType;
import com.forge.auth.User;
import com.forge.auth.UserRepository;
import com.forge.common.ApiException;
import com.forge.issue.Issue;
import com.forge.issue.IssueRepository;
import com.forge.organization.Membership;
import com.forge.organization.OrganizationService;
import com.forge.project.Project;
import com.forge.project.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import static com.forge.comment.CommentDtos.*;

/**
 * Comment policy: any organization member reads and comments (outsiders and cross-organization ids get 404); only the
 * author edits; the author or an owner/admin deletes; archived projects are read-only (409).
 */
@Service
public class CommentService {
    private final CommentRepository comments;
    private final IssueRepository issues;
    private final ProjectRepository projects;
    private final OrganizationService organizations;
    private final UserRepository users;
    private final ActivityRecorder activity;
    private final Clock clock;
    public CommentService(CommentRepository comments, IssueRepository issues, ProjectRepository projects, OrganizationService organizations,
                          UserRepository users, ActivityRecorder activity, Clock clock) {
        this.comments = comments; this.issues = issues; this.projects = projects; this.organizations = organizations; this.users = users; this.activity = activity; this.clock = clock;
    }

    private record Scope(Membership membership, Project project, Issue issue, User caller) {}
    private Scope scope(UUID organizationId, UUID projectId, long number, User user) {
        Membership membership = organizations.requireMember(organizationId, user);
        Project project = projects.findByIdAndOrganizationId(projectId, organizationId).orElseThrow(() -> ApiException.notFound("Project not found"));
        Issue issue = issues.findByProjectIdAndNumber(projectId, number).orElseThrow(() -> ApiException.notFound("Issue not found"));
        return new Scope(membership, project, issue, user);
    }
    private static void requireWritable(Project project) {
        if (project.isArchived()) throw ApiException.conflict("Archived projects are read-only; restore the project first");
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> list(UUID organizationId, UUID projectId, long number, User user) {
        Scope s = scope(organizationId, projectId, number, user);
        List<Comment> found = comments.findByIssueIdOrderByCreatedAtAscIdAsc(s.issue().getId());
        Map<UUID, User> authors = users.findAllById(found.stream().map(Comment::getAuthorId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        return found.stream().map(c -> toResponse(c, authors.get(c.getAuthorId()), s)).toList();
    }

    @Transactional
    public CommentResponse add(UUID organizationId, UUID projectId, long number, User user, CommentRequest input) {
        Scope s = scope(organizationId, projectId, number, user);
        requireWritable(s.project());
        Instant now = Instant.now(clock);
        Comment comment = comments.save(new Comment(s.issue().getId(), user.getId(), input.body(), now));
        activity.record(s.issue().getId(), user.getId(), ActivityType.COMMENTED, null, comment.getId(), now);
        return toResponse(comment, user, s);
    }

    @Transactional
    public CommentResponse edit(UUID organizationId, UUID projectId, long number, UUID commentId, User user, CommentRequest input) {
        Scope s = scope(organizationId, projectId, number, user);
        Comment comment = comments.findByIdAndIssueId(commentId, s.issue().getId()).orElseThrow(() -> ApiException.notFound("Comment not found"));
        requireWritable(s.project());
        if (!comment.getAuthorId().equals(user.getId())) throw ApiException.forbidden("Only the author can edit a comment");
        comment.edit(input.body(), Instant.now(clock));
        return toResponse(comment, users.findById(comment.getAuthorId()).orElseThrow(), s);
    }

    @Transactional
    public void delete(UUID organizationId, UUID projectId, long number, UUID commentId, User user) {
        Scope s = scope(organizationId, projectId, number, user);
        Comment comment = comments.findByIdAndIssueId(commentId, s.issue().getId()).orElseThrow(() -> ApiException.notFound("Comment not found"));
        requireWritable(s.project());
        if (!canDelete(comment, s.membership(), user)) throw ApiException.forbidden("Only the author or an organization admin can delete a comment");
        comments.delete(comment);
    }

    private static boolean canDelete(Comment comment, Membership membership, User user) {
        return comment.getAuthorId().equals(user.getId()) || membership.getRole().canManageOrganization();
    }
    private CommentResponse toResponse(Comment c, User author, Scope s) {
        User caller = s.caller();
        boolean writable = !s.project().isArchived();
        return new CommentResponse(c.getId(), c.getIssueId(), c.getBody(), new AuthorResponse(author.getId(), author.getName()),
                c.getCreatedAt(), c.getUpdatedAt(), writable && c.getAuthorId().equals(caller.getId()), writable && canDelete(c, s.membership(), caller));
    }
}
