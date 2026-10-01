package com.forge.activity;

import com.forge.auth.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import static com.forge.activity.ActivityDtos.ActivityResponse;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/projects/{projectId}/issues/{number}/activity")
public class ActivityController {
    private final ActivityService service;
    private final CurrentUser currentUser;
    public ActivityController(ActivityService service, CurrentUser currentUser) { this.service = service; this.currentUser = currentUser; }

    @GetMapping
    List<ActivityResponse> list(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number, Authentication auth) {
        return service.list(organizationId, projectId, number, currentUser.require(auth));
    }
}
