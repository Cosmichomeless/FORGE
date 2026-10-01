package com.forge.issue;

import com.forge.auth.CurrentUser;
import com.forge.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import static com.forge.issue.IssueDtos.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/projects/{projectId}/issues")
public class IssueController {
    private final IssueQueryService service;
    private final CurrentUser currentUser;
    public IssueController(IssueQueryService service, CurrentUser currentUser) { this.service = service; this.currentUser = currentUser; }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    IssueResponse create(@PathVariable UUID organizationId, @PathVariable UUID projectId, @Valid @RequestBody IssueRequest input, Authentication auth) {
        return service.create(organizationId, projectId, currentUser.require(auth), input);
    }
    /** Filters combine with AND; assignee=none lists unassigned issues; q matches an exact key (FORGE-12) or part of the title. */
    @GetMapping
    IssuePage list(@PathVariable UUID organizationId, @PathVariable UUID projectId,
                   @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size,
                   @RequestParam(defaultValue = "NUMBER") IssueSort sort, @RequestParam(defaultValue = "desc") String direction,
                   @RequestParam(required = false) IssueStatus status, @RequestParam(required = false) IssuePriority priority,
                   @RequestParam(required = false) String assignee, @RequestParam(required = false) String q, Authentication auth) {
        boolean unassigned = "none".equalsIgnoreCase(assignee);
        UUID assigneeId = null;
        if (assignee != null && !unassigned) {
            try { assigneeId = UUID.fromString(assignee); }
            catch (IllegalArgumentException ex) { throw new ApiException(400, "assignee must be a user id or 'none'"); }
        }
        return service.list(organizationId, projectId, currentUser.require(auth), page, size, sort, !"asc".equalsIgnoreCase(direction),
                status, priority, assigneeId, unassigned, q);
    }
    @GetMapping("/{number}")
    IssueResponse get(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number, Authentication auth) {
        return service.get(organizationId, projectId, number, currentUser.require(auth));
    }
    @PutMapping("/{number}")
    IssueResponse edit(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number,
                       @Valid @RequestBody IssueUpdateRequest input, Authentication auth) {
        return service.edit(organizationId, projectId, number, currentUser.require(auth), input);
    }
    @PutMapping("/{number}/assignee")
    IssueResponse assign(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number,
                         @RequestBody AssigneeRequest input, Authentication auth) {
        return service.assign(organizationId, projectId, number, currentUser.require(auth), input);
    }
    @PutMapping("/{number}/status")
    IssueResponse status(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number,
                         @Valid @RequestBody StatusRequest input, Authentication auth) {
        return service.changeStatus(organizationId, projectId, number, currentUser.require(auth), input);
    }
    @PutMapping("/{number}/priority")
    IssueResponse priority(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number,
                           @Valid @RequestBody PriorityRequest input, Authentication auth) {
        return service.changePriority(organizationId, projectId, number, currentUser.require(auth), input);
    }
}
