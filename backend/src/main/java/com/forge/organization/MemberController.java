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
@RequestMapping("/api/v1/organizations/{organizationId}/members")
public class MemberController {
    private final MemberService service;
    private final CurrentUser currentUser;
    public MemberController(MemberService service, CurrentUser currentUser) {
        this.service = service; this.currentUser = currentUser;
    }
    @GetMapping
    List<MemberResponse> list(@PathVariable UUID organizationId, Authentication auth) {
        return service.list(organizationId, currentUser.require(auth));
    }
    @PutMapping("/{userId}")
    MemberResponse changeRole(@PathVariable UUID organizationId, @PathVariable UUID userId, @Valid @RequestBody MemberRoleRequest input, Authentication auth) {
        return service.changeRole(organizationId, userId, currentUser.require(auth), input.role());
    }
    @DeleteMapping("/{userId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@PathVariable UUID organizationId, @PathVariable UUID userId, Authentication auth) {
        service.remove(organizationId, userId, currentUser.require(auth));
    }
}
