package com.forge.comment;

import com.forge.organization.ApiTestSupport;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Comments: add/list, edit/delete policy, project lock, tenant isolation and two-user flow (issues #41-#44). */
class CommentApiTests extends ApiTestSupport {
    private record Ctx(Client ada, Client bob, Client carol, String org, String project, String path) {}
    private Ctx setup() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        var bob = signUp("Bob", "bob@example.com");
        var carol = signUp("Carol", "carol@example.com");
        addMember(org, "bob@example.com", "MEMBER");
        addMember(org, "carol@example.com", "ADMIN");
        String project = ada.json(ada.post("/api/v1/organizations/" + org + "/projects", Map.of("key", "FORGE", "name", "Forge")).andExpect(status().isCreated())).get("id").asText();
        String issues = "/api/v1/organizations/" + org + "/projects/" + project + "/issues";
        ada.post(issues, Map.of("title", "Task")).andExpect(status().isCreated());
        return new Ctx(ada, bob, carol, org, project, issues + "/1/comments");
    }
    private String add(Client who, Ctx c, String body) throws Exception {
        return who.json(who.post(c.path(), Map.of("body", body)).andExpect(status().isCreated())).get("id").asText();
    }

    @Test void membersExchangeCommentsInOrderWithAuthorAndDates() throws Exception {
        Ctx c = setup();
        c.ada().post(c.path(), Map.of("body", "  First  ")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.body").value("First")).andExpect(jsonPath("$.author.name").value("Ada"))
                .andExpect(jsonPath("$.createdAt").exists()).andExpect(jsonPath("$.updatedAt").exists());
        add(c.bob(), c, "Second");
        add(c.ada(), c, "Third");
        c.bob().get(c.path()).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].body").value("First")).andExpect(jsonPath("$[1].author.name").value("Bob")).andExpect(jsonPath("$[2].body").value("Third"))
                .andExpect(jsonPath("$[1].canEdit").value(true)).andExpect(jsonPath("$[0].canEdit").value(false));
    }
    @Test void bodyIsValidated() throws Exception {
        Ctx c = setup();
        c.ada().post(c.path(), Map.of("body", "   ")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.body").exists());
        c.ada().post(c.path(), Map.of("body", "x".repeat(5001))).andExpect(status().isBadRequest());
    }
    @Test void nonMembersAndOtherOrganizationsGetNothing() throws Exception {
        Ctx c = setup();
        String id = add(c.ada(), c, "Secret");
        var eve = signUp("Eve", "eve@example.com");
        eve.get(c.path()).andExpect(status().isNotFound());
        eve.post(c.path(), Map.of("body", "Hack")).andExpect(status().isNotFound());
        eve.put(c.path() + "/" + id, Map.of("body", "Hack")).andExpect(status().isNotFound());
        eve.delete(c.path() + "/" + id).andExpect(status().isNotFound());
        String evesOrg = eve.createOrganization("Evil", "evil");
        eve.get("/api/v1/organizations/" + evesOrg + "/projects/" + c.project() + "/issues/1/comments").andExpect(status().isNotFound());
        c.ada().get(c.path().replace("/issues/1/", "/issues/99/")).andExpect(status().isNotFound());
        c.ada().get(c.path()).andExpect(jsonPath("$[0].body").value("Secret"));
    }
    @Test void onlyTheAuthorEdits() throws Exception {
        Ctx c = setup();
        String id = add(c.bob(), c, "Mine");
        c.bob().put(c.path() + "/" + id, Map.of("body", "Edited")).andExpect(status().isOk()).andExpect(jsonPath("$.body").value("Edited"));
        c.ada().put(c.path() + "/" + id, Map.of("body", "Owner edit")).andExpect(status().isForbidden());
        c.carol().put(c.path() + "/" + id, Map.of("body", "Admin edit")).andExpect(status().isForbidden());
        c.bob().put(c.path() + "/" + id, Map.of("body", " ")).andExpect(status().isBadRequest());
        c.bob().put(c.path() + "/" + java.util.UUID.randomUUID(), Map.of("body", "x")).andExpect(status().isNotFound());
        c.ada().get(c.path()).andExpect(jsonPath("$[0].body").value("Edited"));
    }
    @Test void deletePolicyAllowsAuthorAndAdministrativeRolesOnly() throws Exception {
        Ctx c = setup();
        String mine = add(c.bob(), c, "Bob's");
        String adas = add(c.ada(), c, "Ada's");
        c.bob().delete(c.path() + "/" + adas).andExpect(status().isForbidden());
        c.bob().delete(c.path() + "/" + mine).andExpect(status().isNoContent());
        add(c.bob(), c, "Again");
        c.ada().get(c.path()).andExpect(jsonPath("$[1].canDelete").value(true));
        String again = c.ada().json(c.ada().get(c.path())).get(1).get("id").asText();
        c.carol().delete(c.path() + "/" + again).andExpect(status().isNoContent());   // ADMIN deletes someone else's
        c.ada().delete(c.path() + "/" + adas).andExpect(status().isNoContent());      // author
        c.ada().get(c.path()).andExpect(jsonPath("$", hasSize(0)));
        c.ada().delete(c.path() + "/" + adas).andExpect(status().isNotFound());
    }
    @Test void archivedProjectsAreReadOnly() throws Exception {
        Ctx c = setup();
        String id = add(c.ada(), c, "Before");
        c.ada().post("/api/v1/organizations/" + c.org() + "/projects/" + c.project() + "/archive", Map.of()).andExpect(status().isOk());
        c.ada().get(c.path()).andExpect(status().isOk()).andExpect(jsonPath("$[0].canEdit").value(false)).andExpect(jsonPath("$[0].canDelete").value(false));
        c.ada().post(c.path(), Map.of("body", "After")).andExpect(status().isConflict());
        c.ada().put(c.path() + "/" + id, Map.of("body", "After")).andExpect(status().isConflict());
        c.ada().delete(c.path() + "/" + id).andExpect(status().isConflict());
    }
}
