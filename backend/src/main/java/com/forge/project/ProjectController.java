package com.forge.project;

import com.forge.auth.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import static com.forge.project.ProjectDtos.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/projects")
public class ProjectController {
    private final ProjectService service;
    private final CurrentUser currentUser;
    public ProjectController(ProjectService service, CurrentUser currentUser) { this.service = service; this.currentUser = currentUser; }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    ProjectResponse create(@PathVariable UUID organizationId, @Valid @RequestBody ProjectRequest input, Authentication auth) {
        return service.create(organizationId, currentUser.require(auth), input);
    }
    @GetMapping
    List<ProjectResponse> list(@PathVariable UUID organizationId, @RequestParam(defaultValue = "ACTIVE") ProjectFilter status, Authentication auth) {
        return service.list(organizationId, currentUser.require(auth), status);
    }
    @GetMapping("/{projectId}")
    ProjectResponse get(@PathVariable UUID organizationId, @PathVariable UUID projectId, Authentication auth) {
        return service.get(organizationId, projectId, currentUser.require(auth));
    }
    @PutMapping("/{projectId}")
    ProjectResponse update(@PathVariable UUID organizationId, @PathVariable UUID projectId, @Valid @RequestBody ProjectUpdateRequest input, Authentication auth) {
        return service.update(organizationId, projectId, currentUser.require(auth), input);
    }
    @PostMapping("/{projectId}/archive")
    ProjectResponse archive(@PathVariable UUID organizationId, @PathVariable UUID projectId, Authentication auth) {
        return service.archive(organizationId, projectId, currentUser.require(auth));
    }
    @PostMapping("/{projectId}/restore")
    ProjectResponse restore(@PathVariable UUID organizationId, @PathVariable UUID projectId, Authentication auth) {
        return service.restore(organizationId, projectId, currentUser.require(auth));
    }
}
