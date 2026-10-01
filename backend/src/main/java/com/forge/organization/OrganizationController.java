package com.forge.organization;

import com.forge.auth.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import static com.forge.organization.OrganizationDtos.*;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {
    private final OrganizationService service;
    private final CurrentUser currentUser;
    public OrganizationController(OrganizationService service, CurrentUser currentUser) {
        this.service = service; this.currentUser = currentUser;
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    OrganizationResponse create(@Valid @RequestBody OrganizationRequest input, Authentication auth) {
        return service.create(currentUser.require(auth), input);
    }
    @GetMapping
    List<OrganizationResponse> list(Authentication auth) { return service.listMine(currentUser.require(auth)); }
    @GetMapping("/{organizationId}")
    OrganizationResponse get(@PathVariable UUID organizationId, Authentication auth) {
        return service.get(organizationId, currentUser.require(auth));
    }
    @PutMapping("/{organizationId}")
    OrganizationResponse update(@PathVariable UUID organizationId, @Valid @RequestBody OrganizationRequest input, Authentication auth) {
        return service.update(organizationId, currentUser.require(auth), input);
    }
}
