package com.forge.project;

import com.forge.organization.ApiTestSupport;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Project keys, visibility, role boundaries and the archive policy (issues #26-#28, #31). */
class ProjectTests extends ApiTestSupport {
    private String projects(String organizationId) { return "/api/v1/organizations/" + organizationId + "/projects"; }
    private Map<String, String> project(String key, String name) { return Map.of("key", key, "name", name); }

    @Test void ownersAndAdminsCreateProjectsAndKeysAreNormalized() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "ADMIN");
        ada.post(projects(id), Map.of("key", " forge ", "name", " Forge ", "description", "  Core  ")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("FORGE")).andExpect(jsonPath("$.name").value("Forge"))
                .andExpect(jsonPath("$.description").value("Core")).andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.organizationId").value(id)).andExpect(jsonPath("$.archivedAt").doesNotExist());
        bob.post(projects(id), project("WEB", "Website")).andExpect(status().isCreated());
    }
    @Test void keysMustBeShortUppercaseIdentifiers() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        for (String key : new String[] {"A", "1AB", "AB-C", "AB C", "ABCDEFGHIJK", ""}) {
            ada.post(projects(id), project(key, "Bad")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.key").exists());
        }
        ada.post(projects(id), Map.of("key", "OK", "name", " ")).andExpect(status().isBadRequest());
        ada.post(projects(id), Map.of("key", "OK", "name", "x".repeat(101))).andExpect(status().isBadRequest());
        ada.post(projects(id), Map.of("key", "OK", "name", "Fine", "description", "x".repeat(501))).andExpect(status().isBadRequest());
        ada.post(projects(id), project("A1", "Digits ok")).andExpect(status().isCreated());
        ada.get(projects(id)).andExpect(jsonPath("$", hasSize(1)));
    }
    @Test void aKeyIsUniqueInsideAnOrganizationRegardlessOfCase() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        ada.post(projects(id), project("FORGE", "Forge")).andExpect(status().isCreated());
        ada.post(projects(id), project("FORGE", "Other")).andExpect(status().isConflict()).andExpect(jsonPath("$.fieldErrors.key").exists());
        ada.post(projects(id), project("forge", "Other")).andExpect(status().isConflict());
        ada.get(projects(id)).andExpect(jsonPath("$", hasSize(1)));
    }
    @Test void theSameKeyIsValidInAnotherOrganization() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String acme = ada.createOrganization("Acme", "acme");
        String globex = bob.createOrganization("Globex", "globex");
        ada.post(projects(acme), project("FORGE", "Forge")).andExpect(status().isCreated());
        bob.post(projects(globex), project("FORGE", "Forge")).andExpect(status().isCreated());
        var second = ada.createOrganization("Second", "second");
        ada.post(projects(second), project("FORGE", "Forge")).andExpect(status().isCreated());
    }
    @Test void archivedKeysStayReserved() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        String projectId = ada.json(ada.post(projects(id), project("FORGE", "Forge")).andExpect(status().isCreated())).get("id").asText();
        ada.post(projects(id) + "/" + projectId + "/archive", null).andExpect(status().isOk());
        ada.post(projects(id), project("FORGE", "Again")).andExpect(status().isConflict());
    }
    @Test void membersSeeOnlyProjectsOfTheirOrganizations() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        var cy = signUp("Cy", "cy@example.com");
        String acme = ada.createOrganization("Acme", "acme");
        String globex = cy.createOrganization("Globex", "globex");
        addMember(acme, "bob@example.com", "MEMBER");
        ada.post(projects(acme), project("ALPHA", "alpha")).andExpect(status().isCreated());
        ada.post(projects(acme), project("BETA", "Beta")).andExpect(status().isCreated());
        cy.post(projects(globex), project("GAMMA", "Gamma")).andExpect(status().isCreated());
        bob.get(projects(acme)).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].key").value("ALPHA")).andExpect(jsonPath("$[1].key").value("BETA"));
        bob.get(projects(globex)).andExpect(status().isNotFound());
        cy.get(projects(acme)).andExpect(status().isNotFound());
        ada.get(projects(globex)).andExpect(status().isNotFound());
    }
    @Test void plainMembersCannotCreateEditOrArchive() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Acme", "acme");
        addMember(id, "bob@example.com", "MEMBER");
        String projectId = ada.json(ada.post(projects(id), project("FORGE", "Forge")).andExpect(status().isCreated())).get("id").asText();
        String path = projects(id) + "/" + projectId;
        bob.post(projects(id), project("NEW", "New")).andExpect(status().isForbidden());
        bob.put(path, Map.of("name", "Hacked")).andExpect(status().isForbidden());
        bob.post(path + "/archive", null).andExpect(status().isForbidden());
        ada.post(path + "/archive", null).andExpect(status().isOk());
        bob.post(path + "/restore", null).andExpect(status().isForbidden());
        bob.get(path).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Forge")).andExpect(jsonPath("$.status").value("ARCHIVED"));
        ada.get(projects(id) + "?status=ALL").andExpect(jsonPath("$", hasSize(1)));
    }
    @Test void outsidersAndAnonymousUsersCannotTouchProjects() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var cy = signUp("Cy", "cy@example.com");
        String id = ada.createOrganization("Acme", "acme");
        String projectId = ada.json(ada.post(projects(id), project("FORGE", "Forge")).andExpect(status().isCreated())).get("id").asText();
        String path = projects(id) + "/" + projectId;
        cy.post(projects(id), project("NEW", "New")).andExpect(status().isNotFound());
        cy.get(path).andExpect(status().isNotFound());
        cy.put(path, Map.of("name", "Hacked")).andExpect(status().isNotFound());
        cy.post(path + "/archive", null).andExpect(status().isNotFound());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path)).andExpect(status().isUnauthorized());
    }
    @Test void aProjectIsOnlyReachableThroughItsOwnOrganization() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String acme = ada.createOrganization("Acme", "acme");
        String other = ada.createOrganization("Other", "other");
        String projectId = ada.json(ada.post(projects(acme), project("FORGE", "Forge")).andExpect(status().isCreated())).get("id").asText();
        ada.get(projects(other) + "/" + projectId).andExpect(status().isNotFound());
        ada.put(projects(other) + "/" + projectId, Map.of("name", "Moved")).andExpect(status().isNotFound());
        ada.post(projects(other) + "/" + projectId + "/archive", null).andExpect(status().isNotFound());
        ada.get(projects(acme) + "/" + java.util.UUID.randomUUID()).andExpect(status().isNotFound());
        ada.get(projects(acme) + "/not-a-uuid").andExpect(status().isBadRequest());
    }
    @Test void ownersEditNameAndDescriptionButNeverTheKey() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        String projectId = ada.json(ada.post(projects(id), Map.of("key", "FORGE", "name", "Forge", "description", "Old")).andExpect(status().isCreated())).get("id").asText();
        String path = projects(id) + "/" + projectId;
        ada.put(path, Map.of("name", "Forge 2", "description", " ")).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Forge 2"))
                .andExpect(jsonPath("$.description").doesNotExist()).andExpect(jsonPath("$.key").value("FORGE"));
        ada.put(path, Map.of("key", "OTHER", "name", "Forge 3")).andExpect(status().isOk()).andExpect(jsonPath("$.key").value("FORGE"));
        ada.put(path, Map.of("name", " ")).andExpect(status().isBadRequest());
        ada.get(path).andExpect(jsonPath("$.name").value("Forge 3"));
    }
    @Test void archivingHidesFromTheActiveListButKeepsTheProject() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Acme", "acme");
        String keep = ada.json(ada.post(projects(id), project("KEEP", "Keep")).andExpect(status().isCreated())).get("id").asText();
        String old = ada.json(ada.post(projects(id), Map.of("key", "OLD", "name", "Old", "description", "Legacy")).andExpect(status().isCreated())).get("id").asText();
        String path = projects(id) + "/" + old;
        ada.post(path + "/archive", null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ARCHIVED")).andExpect(jsonPath("$.archivedAt").exists());
        ada.post(path + "/archive", null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ARCHIVED"));
        ada.get(projects(id)).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(keep));
        ada.get(projects(id) + "?status=ARCHIVED").andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(old));
        ada.get(projects(id) + "?status=ALL").andExpect(jsonPath("$", hasSize(2)));
        ada.get(projects(id) + "?status=bogus").andExpect(status().isBadRequest());
        ada.get(path).andExpect(status().isOk()).andExpect(jsonPath("$.description").value("Legacy")).andExpect(jsonPath("$.key").value("OLD"));
        ada.put(path, Map.of("name", "Renamed")).andExpect(status().isConflict());
        ada.post(path + "/restore", null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE")).andExpect(jsonPath("$.archivedAt").doesNotExist());
        ada.get(projects(id)).andExpect(jsonPath("$", hasSize(2)));
        ada.put(path, Map.of("name", "Renamed")).andExpect(status().isOk());
    }
}
