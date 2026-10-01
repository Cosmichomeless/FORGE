package com.forge.organization;

import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class InvitationTests extends ApiTestSupport {
    private String invite(Client who, String organizationId, String email, String role) throws Exception {
        return who.json(who.post("/api/v1/organizations/" + organizationId + "/invitations", Map.of("email", email, "role", role))
                .andExpect(status().isCreated())).get("token").asText();
    }

    @Test void ownersAndAdminsInviteWithExpiryAndOnlyTheTokenHashIsStored() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", " New@Example.COM ", "role", "MEMBER"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.role").value("MEMBER")).andExpect(jsonPath("$.expiresAt").exists())
                .andExpect(jsonPath("$.token").isNotEmpty());
        var stored = jdbc.queryForMap("select token_hash, created_at, expires_at from invitations");
        assertThat((String) stored.get("token_hash")).hasSize(64).matches("[0-9a-f]+");
        var created = ((java.time.OffsetDateTime) stored.get("created_at")).toInstant();
        var expires = ((java.time.OffsetDateTime) stored.get("expires_at")).toInstant();
        assertThat(java.time.Duration.between(created, expires)).isEqualTo(java.time.Duration.ofDays(7));
    }
    @Test void membersAndOutsidersCannotInvite() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        var cy = signUp("Cy", "cy@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "MEMBER");
        var body = Map.of("email", "x@example.com", "role", "MEMBER");
        bob.post("/api/v1/organizations/" + id + "/invitations", body).andExpect(status().isForbidden());
        cy.post("/api/v1/organizations/" + id + "/invitations", body).andExpect(status().isNotFound());
        bob.get("/api/v1/organizations/" + id + "/invitations").andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("select count(*) from invitations", Integer.class)).isZero();
    }
    @Test void rejectsOwnerRoleAndInvalidEmail() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", "x@example.com", "role", "OWNER"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.role").exists());
        ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", "nope", "role", "MEMBER"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.email").exists());
    }
    @Test void cannotInviteExistingMembersOrDuplicatePendingInvitations() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", "ADA@example.com", "role", "MEMBER"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.fieldErrors.email").exists());
        invite(ada, id, "bob@example.com", "MEMBER");
        ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", "bob@example.com", "role", "ADMIN"))
                .andExpect(status().isConflict());
    }
    @Test void anExpiredInvitationCanBeReissued() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        invite(ada, id, "bob@example.com", "MEMBER");
        expireAll();
        ada.get("/api/v1/organizations/" + id + "/invitations").andExpect(jsonPath("$", hasSize(0)));
        invite(ada, id, "bob@example.com", "MEMBER");
        assertThat(jdbc.queryForObject("select count(*) from invitations", Integer.class)).isEqualTo(1);
    }
    @Test void listsAndRevokesPendingInvitationsWithoutExposingTokens() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        String other = bob.createOrganization("Other", "other");
        invite(ada, id, "cy@example.com", "ADMIN");
        var list = ada.get("/api/v1/organizations/" + id + "/invitations").andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].token").doesNotExist());
        String invitationId = ada.json(list).get(0).get("id").asText();
        bob.delete("/api/v1/organizations/" + other + "/invitations/" + invitationId).andExpect(status().isNotFound());
        ada.delete("/api/v1/organizations/" + id + "/invitations/" + invitationId).andExpect(status().isNoContent());
        ada.delete("/api/v1/organizations/" + id + "/invitations/" + invitationId).andExpect(status().isNotFound());
    }
    @Test void acceptingCreatesExactlyOneMembershipWithTheInvitedRole() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        String token = invite(ada, id, "bob@example.com", "ADMIN");
        bob.post("/api/v1/invitations/accept", Map.of("token", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id)).andExpect(jsonPath("$.role").value("ADMIN"));
        assertThat(jdbc.queryForObject("select count(*) from memberships where organization_id = ?::uuid", Integer.class, id)).isEqualTo(2);
        bob.get("/api/v1/organizations/" + id).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ADMIN"));
        bob.post("/api/v1/invitations/accept", Map.of("token", token)).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("select count(*) from memberships where organization_id = ?::uuid", Integer.class, id)).isEqualTo(2);
    }
    @Test void rejectsExpiredUnknownAndForeignEmailInvitations() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        var cy = signUp("Cy", "cy@example.com");
        String id = ada.createOrganization("Acme", "acme");
        String token = invite(ada, id, "bob@example.com", "MEMBER");
        cy.post("/api/v1/invitations/accept", Map.of("token", token)).andExpect(status().isForbidden());
        bob.post("/api/v1/invitations/accept", Map.of("token", "unknown")).andExpect(status().isNotFound());
        bob.post("/api/v1/invitations/accept", Map.of("token", " ")).andExpect(status().isBadRequest());
        expireAll();
        bob.post("/api/v1/invitations/accept", Map.of("token", token)).andExpect(status().isGone());
        assertThat(jdbc.queryForObject("select count(*) from memberships", Integer.class)).isEqualTo(1);
    }
    @Test void anonymousUsersCannotAcceptOrInvite() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/invitations/accept"))
                .andExpect(status().isForbidden());
    }

    private void expireAll() {
        jdbc.update("update invitations set created_at = ?, expires_at = ?", java.sql.Timestamp.from(Instant.now().minusSeconds(7200)), java.sql.Timestamp.from(Instant.now().minusSeconds(3600)));
    }
}
