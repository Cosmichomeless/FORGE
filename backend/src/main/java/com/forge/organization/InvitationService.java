package com.forge.organization;

import com.forge.auth.User;
import com.forge.auth.UserRepository;
import com.forge.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static com.forge.organization.OrganizationDtos.*;

@Service
public class InvitationService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final OrganizationRepository organizations;
    private final MembershipRepository memberships;
    private final InvitationRepository invitations;
    private final UserRepository users;
    private final OrganizationService organizationService;
    private final Clock clock;
    private final Duration ttl;
    public InvitationService(OrganizationRepository organizations, MembershipRepository memberships, InvitationRepository invitations,
                             UserRepository users, OrganizationService organizationService, Clock clock,
                             @Value("${app.invitation-ttl:7d}") Duration ttl) {
        this.organizations = organizations; this.memberships = memberships; this.invitations = invitations;
        this.users = users; this.organizationService = organizationService; this.clock = clock; this.ttl = ttl;
    }

    @Transactional
    public CreatedInvitationResponse create(UUID organizationId, User inviter, InvitationRequest input) {
        requireManager(organizationId, inviter);
        if (input.role() == Role.OWNER) {
            throw new ApiException(400, "Invalid input", Map.of("role", "Invitations can only grant ADMIN or MEMBER"));
        }
        organizations.findForUpdate(organizationId).orElseThrow(() -> ApiException.notFound("Organization not found"));
        boolean alreadyMember = users.findByEmail(input.email())
                .map(existing -> memberships.existsByOrganizationIdAndUserId(organizationId, existing.getId())).orElse(false);
        if (alreadyMember) throw ApiException.conflict("This user is already a member", "email");
        Instant now = Instant.now(clock);
        invitations.deleteExpired(organizationId, input.email(), now);
        if (invitations.existsPending(organizationId, input.email(), now)) {
            throw ApiException.conflict("A pending invitation already exists for this email", "email");
        }
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Invitation invitation = invitations.saveAndFlush(new Invitation(organizationId, input.email(), input.role(), hash(token), inviter.getId(), now, now.plus(ttl)));
        return new CreatedInvitationResponse(invitation.getId(), invitation.getEmail(), invitation.getRole(), invitation.getCreatedAt(), invitation.getExpiresAt(), token);
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> listPending(UUID organizationId, User user) {
        requireManager(organizationId, user);
        return invitations.findPending(organizationId, Instant.now(clock)).stream().map(InvitationResponse::from).toList();
    }

    @Transactional
    public void revoke(UUID organizationId, UUID invitationId, User user) {
        requireManager(organizationId, user);
        Invitation invitation = invitations.findByIdAndOrganizationId(invitationId, organizationId)
                .filter(found -> !found.isAccepted()).orElseThrow(() -> ApiException.notFound("Invitation not found"));
        invitations.delete(invitation);
    }

    @Transactional
    public OrganizationResponse accept(User user, AcceptInvitationRequest input) {
        Invitation invitation = invitations.findByTokenHashForUpdate(hash(input.token()))
                .orElseThrow(() -> ApiException.notFound("Invitation not found"));
        if (!invitation.getEmail().equals(user.getEmail())) throw ApiException.forbidden("This invitation was issued for a different email");
        if (invitation.isAccepted()) throw ApiException.conflict("This invitation has already been used");
        if (invitation.isExpired(Instant.now(clock))) throw new ApiException(410, "This invitation has expired");
        Organization organization = organizations.findForUpdate(invitation.getOrganizationId())
                .orElseThrow(() -> ApiException.notFound("Organization not found"));
        if (memberships.existsByOrganizationIdAndUserId(organization.getId(), user.getId())) {
            throw ApiException.conflict("You are already a member of this organization");
        }
        Instant now = Instant.now(clock);
        try {
            memberships.saveAndFlush(new Membership(organization.getId(), user.getId(), invitation.getRole(), now));
        } catch (DataIntegrityViolationException ex) {
            throw ApiException.conflict("You are already a member of this organization");
        }
        invitation.accept(user.getId(), now);
        return OrganizationResponse.from(organization, invitation.getRole());
    }

    private void requireManager(UUID organizationId, User user) {
        OrganizationService.requireManager(organizationService.requireMember(organizationId, user));
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
