package com.forge.organization;

import com.forge.auth.User;
import com.forge.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;
import static com.forge.organization.OrganizationDtos.*;

/**
 * Membership rules. OWNERs manage everyone; ADMINs manage plain MEMBERs (and may promote them to ADMIN);
 * MEMBERs only list the roster and may leave. An organization always keeps at least one OWNER.
 */
@Service
public class MemberService {
    private final OrganizationRepository organizations;
    private final MembershipRepository memberships;
    private final OrganizationService organizationService;
    public MemberService(OrganizationRepository organizations, MembershipRepository memberships, OrganizationService organizationService) {
        this.organizations = organizations; this.memberships = memberships; this.organizationService = organizationService;
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> list(UUID organizationId, User user) {
        organizationService.requireMember(organizationId, user);
        return memberships.findAllForOrganization(organizationId).stream().map(MemberResponse::from).toList();
    }

    @Transactional
    public MemberResponse changeRole(UUID organizationId, UUID targetUserId, User actor, Role newRole) {
        Membership actorMembership = lockAndRequireMember(organizationId, actor);
        OrganizationService.requireManager(actorMembership);
        Membership target = findMember(organizationId, targetUserId);
        if (actorMembership.getRole() == Role.ADMIN && (target.getRole() != Role.MEMBER || newRole == Role.OWNER)) {
            throw ApiException.forbidden("Admins can only manage members and promote them to admin");
        }
        if (target.getRole() == Role.OWNER && newRole != Role.OWNER) requireAnotherOwner(organizationId);
        target.changeRole(newRole);
        return MemberResponse.from(memberships.saveAndFlush(target));
    }

    @Transactional
    public void remove(UUID organizationId, UUID targetUserId, User actor) {
        Membership actorMembership = lockAndRequireMember(organizationId, actor);
        Membership target = findMember(organizationId, targetUserId);
        if (!target.getUserId().equals(actor.getId())) {
            OrganizationService.requireManager(actorMembership);
            if (actorMembership.getRole() == Role.ADMIN && target.getRole() != Role.MEMBER) {
                throw ApiException.forbidden("Admins can only remove members");
            }
        }
        if (target.getRole() == Role.OWNER) requireAnotherOwner(organizationId);
        memberships.delete(target);
    }

    private Membership lockAndRequireMember(UUID organizationId, User user) {
        organizations.findForUpdate(organizationId).orElseThrow(() -> ApiException.notFound("Organization not found"));
        return organizationService.requireMember(organizationId, user);
    }

    private Membership findMember(UUID organizationId, UUID userId) {
        return memberships.findByOrganizationIdAndUserId(organizationId, userId).orElseThrow(() -> ApiException.notFound("Member not found"));
    }

    private void requireAnotherOwner(UUID organizationId) {
        if (memberships.countByOrganizationIdAndRole(organizationId, Role.OWNER) <= 1) {
            throw ApiException.conflict("An organization must keep at least one owner");
        }
    }
}
