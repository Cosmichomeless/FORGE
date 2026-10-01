package com.forge.organization;

import com.forge.auth.User;
import com.forge.common.ApiException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import static com.forge.organization.OrganizationDtos.*;

@Service
public class OrganizationService {
    private final OrganizationRepository organizations;
    private final MembershipRepository memberships;
    private final Clock clock;
    public OrganizationService(OrganizationRepository organizations, MembershipRepository memberships, Clock clock) {
        this.organizations = organizations; this.memberships = memberships; this.clock = clock;
    }

    @Transactional
    public OrganizationResponse create(User user, OrganizationRequest input) {
        if (organizations.existsBySlug(input.slug())) throw slugTaken();
        Instant now = Instant.now(clock);
        try {
            Organization organization = organizations.saveAndFlush(new Organization(input.name(), input.slug(), now));
            memberships.saveAndFlush(new Membership(organization.getId(), user.getId(), Role.OWNER, now));
            return OrganizationResponse.from(organization, Role.OWNER);
        } catch (DataIntegrityViolationException ex) {
            throw slugTaken();
        }
    }

    @Transactional(readOnly = true)
    public List<OrganizationResponse> listMine(User user) {
        return memberships.findAllForUser(user.getId()).stream()
                .map(m -> OrganizationResponse.from(m.getOrganization(), m.getRole())).toList();
    }

    @Transactional(readOnly = true)
    public OrganizationResponse get(UUID organizationId, User user) {
        Membership membership = requireMember(organizationId, user);
        return OrganizationResponse.from(membership.getOrganization(), membership.getRole());
    }

    @Transactional
    public OrganizationResponse update(UUID organizationId, User user, OrganizationRequest input) {
        Membership membership = requireMember(organizationId, user);
        requireManager(membership);
        Organization organization = membership.getOrganization();
        if (organizations.existsBySlugAndIdNot(input.slug(), organizationId)) throw slugTaken();
        organization.rename(input.name(), input.slug());
        try {
            organizations.saveAndFlush(organization);
        } catch (DataIntegrityViolationException ex) {
            throw slugTaken();
        }
        return OrganizationResponse.from(organization, membership.getRole());
    }

    /** Returns the caller's membership; organizations of others look nonexistent (404). */
    public Membership requireMember(UUID organizationId, User user) {
        return memberships.findByOrganizationIdAndUserId(organizationId, user.getId())
                .orElseThrow(() -> ApiException.notFound("Organization not found"));
    }

    public static void requireManager(Membership membership) {
        if (!membership.getRole().canManageOrganization()) throw ApiException.forbidden("Only owners and admins can do this");
    }

    private static ApiException slugTaken() { return ApiException.conflict("Slug already in use", "slug"); }
}
