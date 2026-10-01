package com.forge.organization;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class OrganizationApiTests extends ApiTestSupport {
    @Test void creatingAnOrganizationMakesTheCreatorItsOwnerAtomically() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        ada.post("/api/v1/organizations", Map.of("name", "  Acme Inc ", "slug", " Acme-Inc "))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Acme Inc"))
                .andExpect(jsonPath("$.slug").value("acme-inc")).andExpect(jsonPath("$.role").value("OWNER"))
                .andExpect(jsonPath("$.id").exists());
        assertThat(jdbc.queryForObject("select count(*) from memberships where role = 'OWNER'", Integer.class)).isEqualTo(1);
    }
    @Test void slugMustBeUniqueAcrossOrganizationsAndLeavesNoOrphans() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        ada.createOrganization("Acme", "acme");
        bob.post("/api/v1/organizations", Map.of("name", "Other", "slug", "ACME"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.fieldErrors.slug").exists());
        assertThat(jdbc.queryForObject("select count(*) from organizations", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from memberships", Integer.class)).isEqualTo(1);
    }
    @Test void databaseRejectsDuplicateMembershipsAndSlugs() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        String userId = jdbc.queryForObject("select id from users", String.class);
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("insert into memberships (id, organization_id, user_id, role, created_at) values (random_uuid(), ?::uuid, ?::uuid, 'MEMBER', current_timestamp)", id, userId));
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("insert into organizations (id, name, slug, created_at) values (random_uuid(), 'Dup', 'acme', current_timestamp)"));
        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("update memberships set role = 'BOSS'"));
    }
    @Test void validatesNameAndSlug() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        ada.post("/api/v1/organizations", Map.of("name", " ", "slug", "Bad Slug!"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.slug").exists());
        ada.post("/api/v1/organizations", Map.of("name", "a".repeat(101), "slug", "-bad-"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.name").exists());
    }
    @Test void listShowsOnlyMyOrganizationsWithMyRole() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        ada.createOrganization("Zeta", "zeta");
        ada.createOrganization("Alpha", "alpha");
        bob.createOrganization("Bobs", "bobs");
        ada.get("/api/v1/organizations").andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].slug").value("alpha")).andExpect(jsonPath("$[1].slug").value("zeta"))
                .andExpect(jsonPath("$[0].role").value("OWNER"));
    }
    @Test void membersCanReadOrganizationsOthersCannot() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        ada.get("/api/v1/organizations/" + id).andExpect(status().isOk()).andExpect(jsonPath("$.slug").value("acme"));
        bob.get("/api/v1/organizations/" + id).andExpect(status().isNotFound());
        bob.get("/api/v1/organizations/" + java.util.UUID.randomUUID()).andExpect(status().isNotFound());
        bob.get("/api/v1/organizations/not-a-uuid").andExpect(status().isBadRequest());
    }
    @Test void ownersAndAdminsCanUpdateButMembersCannot() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        var cy = signUp("Cy", "cy@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "ADMIN");
        addMember(id, "cy@example.com", "MEMBER");
        ada.put("/api/v1/organizations/" + id, Map.of("name", "Acme Corp", "slug", "acme")).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Acme Corp"));
        bob.put("/api/v1/organizations/" + id, Map.of("name", "Acme Two", "slug", "acme-two")).andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("acme-two")).andExpect(jsonPath("$.role").value("ADMIN"));
        cy.put("/api/v1/organizations/" + id, Map.of("name", "Hacked", "slug", "hacked")).andExpect(status().isForbidden());
        ada.put("/api/v1/organizations/" + id, Map.of("name", "", "slug", "x")).andExpect(status().isBadRequest());
        ada.get("/api/v1/organizations/" + id).andExpect(jsonPath("$.name").value("Acme Two"));
    }
    @Test void updateRejectsSlugOfAnotherOrganizationButKeepsOwnSlug() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        ada.createOrganization("One", "one");
        String two = ada.createOrganization("Two", "two");
        ada.put("/api/v1/organizations/" + two, Map.of("name", "Two", "slug", "one")).andExpect(status().isConflict());
        ada.put("/api/v1/organizations/" + two, Map.of("name", "Two renamed", "slug", "two")).andExpect(status().isOk());
    }
    @Test void outsidersCannotUpdateAndAnonymousRequestsAreRejected() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        bob.put("/api/v1/organizations/" + id, Map.of("name", "Hacked", "slug", "hacked")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/organizations")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/organizations/" + id)).andExpect(status().isUnauthorized());
    }
    @Test void corsPreflightAllowsPutAndDeleteForTheConfiguredOrigin() throws Exception {
        for (String method : new String[] {"PUT", "DELETE"}) {
            mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/v1/organizations/x")
                    .header("Origin", "http://localhost:3000").header("Access-Control-Request-Method", method)
                    .header("Access-Control-Request-Headers", "content-type,x-csrf-token"))
                    .andExpect(status().isOk());
        }
    }

    void addMember(String organizationId, String email, String role) {
        jdbc.update("insert into memberships (id, organization_id, user_id, role, created_at) select random_uuid(), ?::uuid, id, ?, current_timestamp from users where email = ?",
                organizationId, role, email);
    }
}
