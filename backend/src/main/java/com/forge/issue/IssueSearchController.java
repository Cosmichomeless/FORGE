package com.forge.issue;

import com.forge.auth.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import static com.forge.issue.IssueDtos.*;

@RestController
@RequestMapping("/api/v1")
public class IssueSearchController {
    private final IssueSearchService service;
    private final CurrentUser currentUser;
    public IssueSearchController(IssueSearchService service, CurrentUser currentUser) { this.service = service; this.currentUser = currentUser; }

    /** Searches all projects of an organization by exact key (FORGE-12) or title text. */
    @GetMapping("/organizations/{organizationId}/issues")
    IssuePage search(@PathVariable UUID organizationId, @RequestParam(required = false) String q,
                     @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size, Authentication auth) {
        return service.search(organizationId, currentUser.require(auth), q, page, size);
    }
    /** The caller's own work across every organization they belong to. */
    @GetMapping("/me/dashboard")
    DashboardResponse dashboard(Authentication auth) { return service.dashboard(currentUser.require(auth)); }
}
