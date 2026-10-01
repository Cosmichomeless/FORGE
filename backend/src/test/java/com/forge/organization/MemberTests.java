package com.forge.organization;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class MemberTests extends ApiTestSupport {
    private String path(String organizationId, String email) { return "/api/v1/organizations/" + organizationId + "/members/" + userId(email); }

    @Test void everyMemberCanListTheRosterOutsidersCannot() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        var cy = signUp("Cy", "cy@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "MEMBER");
        bob.get("/api/v1/organizations/" + id + "/members").andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].email").value("ada@example.com")).andExpect(jsonPath("$[0].role").value("OWNER"))
                .andExpect(jsonPath("$[1].name").value("Bob")).andExpect(jsonPath("$[0].passwordHash").doesNotExist());
        cy.get("/api/v1/organizations/" + id + "/members").andExpect(status().isNotFound());
    }
    @Test void membersCannotChangeRolesOrRemoveOthers() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        signUp("Cy", "cy@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "MEMBER");
        addMember(id, "cy@example.com", "MEMBER");
        bob.put(path(id, "cy@example.com"), Map.of("role", "ADMIN")).andExpect(status().isForbidden());
        bob.put(path(id, "bob@example.com"), Map.of("role", "OWNER")).andExpect(status().isForbidden());
        bob.delete(path(id, "cy@example.com")).andExpect(status().isForbidden());
        bob.delete(path(id, "ada@example.com")).andExpect(status().isForbidden());
    }
    @Test void ownersChangeRolesAndRemoveMembers() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "MEMBER");
        ada.put(path(id, "bob@example.com"), Map.of("role", "ADMIN")).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ADMIN"));
        ada.put(path(id, "bob@example.com"), Map.of("role", "BOSS")).andExpect(status().isBadRequest());
        ada.delete(path(id, "bob@example.com")).andExpect(status().isNoContent());
        ada.delete(path(id, "bob@example.com")).andExpect(status().isNotFound());
        ada.get("/api/v1/organizations/" + id + "/members").andExpect(jsonPath("$", hasSize(1)));
    }
    @Test void adminsOnlyManagePlainMembers() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        signUp("Cy", "cy@example.com");
        signUp("Di", "di@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "ADMIN");
        addMember(id, "cy@example.com", "MEMBER");
        addMember(id, "di@example.com", "ADMIN");
        bob.put(path(id, "cy@example.com"), Map.of("role", "ADMIN")).andExpect(status().isOk());
        bob.put(path(id, "cy@example.com"), Map.of("role", "OWNER")).andExpect(status().isForbidden());
        bob.put(path(id, "di@example.com"), Map.of("role", "MEMBER")).andExpect(status().isForbidden());
        bob.put(path(id, "ada@example.com"), Map.of("role", "MEMBER")).andExpect(status().isForbidden());
        bob.delete(path(id, "ada@example.com")).andExpect(status().isForbidden());
        bob.delete(path(id, "di@example.com")).andExpect(status().isForbidden());
        bob.put(path(id, "bob@example.com"), Map.of("role", "OWNER")).andExpect(status().isForbidden());
    }
    @Test void theLastOwnerCannotBeRemovedOrDemoted() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        ada.put(path(id, "ada@example.com"), Map.of("role", "ADMIN")).andExpect(status().isConflict());
        ada.put(path(id, "ada@example.com"), Map.of("role", "MEMBER")).andExpect(status().isConflict());
        ada.delete(path(id, "ada@example.com")).andExpect(status().isConflict());
        ada.get("/api/v1/organizations/" + id).andExpect(jsonPath("$.role").value("OWNER"));
    }
    @Test void ownershipCanBeSharedThenTheFirstOwnerMayStepDownOrLeave() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "MEMBER");
        ada.put(path(id, "bob@example.com"), Map.of("role", "OWNER")).andExpect(status().isOk());
        ada.put(path(id, "ada@example.com"), Map.of("role", "MEMBER")).andExpect(status().isOk());
        bob.delete(path(id, "bob@example.com")).andExpect(status().isConflict());
        ada.delete(path(id, "ada@example.com")).andExpect(status().isNoContent());
        ada.get("/api/v1/organizations/" + id).andExpect(status().isNotFound());
        bob.get("/api/v1/organizations/" + id + "/members").andExpect(jsonPath("$", hasSize(1)));
    }
    @Test void anyMemberMayLeaveAndRemovedUsersLoseAccess() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "MEMBER");
        bob.delete(path(id, "bob@example.com")).andExpect(status().isNoContent());
        bob.get("/api/v1/organizations/" + id).andExpect(status().isNotFound());
        bob.get("/api/v1/organizations").andExpect(jsonPath("$", hasSize(0)));
    }
    @Test void aRemovedMemberCanBeInvitedAgain() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        for (int i = 0; i < 2; i++) {
            String token = ada.json(ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", "bob@example.com", "role", "MEMBER"))
                    .andExpect(status().isCreated())).get("token").asText();
            bob.post("/api/v1/invitations/accept", Map.of("token", token)).andExpect(status().isOk());
            ada.delete(path(id, "bob@example.com")).andExpect(status().isNoContent());
        }
    }
}
