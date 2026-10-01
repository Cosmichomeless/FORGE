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
@RequestMapping("/api/v1")
public class InvitationController {
    private final InvitationService service;
    private final CurrentUser currentUser;
    public InvitationController(InvitationService service, CurrentUser currentUser) {
        this.service = service; this.currentUser = currentUser;
    }
    @PostMapping("/organizations/{organizationId}/invitations") @ResponseStatus(HttpStatus.CREATED)
    CreatedInvitationResponse create(@PathVariable UUID organizationId, @Valid @RequestBody InvitationRequest input, Authentication auth) {
        return service.create(organizationId, currentUser.require(auth), input);
    }
    @GetMapping("/organizations/{organizationId}/invitations")
    List<InvitationResponse> list(@PathVariable UUID organizationId, Authentication auth) {
        return service.listPending(organizationId, currentUser.require(auth));
    }
    @DeleteMapping("/organizations/{organizationId}/invitations/{invitationId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void revoke(@PathVariable UUID organizationId, @PathVariable UUID invitationId, Authentication auth) {
        service.revoke(organizationId, invitationId, currentUser.require(auth));
    }
    @PostMapping("/invitations/accept")
    OrganizationResponse accept(@Valid @RequestBody AcceptInvitationRequest input, Authentication auth) {
        return service.accept(currentUser.require(auth), input);
    }
}
