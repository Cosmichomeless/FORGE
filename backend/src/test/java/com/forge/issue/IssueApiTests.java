package com.forge.issue;

import com.forge.organization.ApiTestSupport;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Issue endpoints: create/list/read, edit, assignment, workflow, pagination and filters (issues #33-#37, #40). */
class IssueApiTests extends ApiTestSupport {
    private record Ctx(Client ada, String org, String project, String path) {}
    private Ctx setup() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        String project = ada.json(ada.post("/api/v1/organizations/" + org + "/projects", Map.of("key", "FORGE", "name", "Forge")).andExpect(status().isCreated())).get("id").asText();
        return new Ctx(ada, org, project, "/api/v1/organizations/" + org + "/projects/" + project + "/issues");
    }
    private void create(Ctx c, String title) throws Exception { c.ada().post(c.path(), Map.of("title", title)).andExpect(status().isCreated()); }

    @Test void createRecordsCreatorProjectNumberAndDefaults() throws Exception {
        Ctx c = setup();
        c.ada().post(c.path(), Map.of("title", "  First  ", "description", " Details ")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.identifier").value("FORGE-1")).andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.title").value("First")).andExpect(jsonPath("$.description").value("Details"))
                .andExpect(jsonPath("$.projectId").value(c.project())).andExpect(jsonPath("$.createdBy.name").value("Ada"))
                .andExpect(jsonPath("$.status").value("TODO")).andExpect(jsonPath("$.priority").value("MEDIUM"))
                .andExpect(jsonPath("$.assignee").doesNotExist());
        create(c, "Second");
        c.ada().get(c.path() + "/2").andExpect(status().isOk()).andExpect(jsonPath("$.identifier").value("FORGE-2"));
        c.ada().get(c.path()).andExpect(jsonPath("$.items", hasSize(2))).andExpect(jsonPath("$.totalItems").value(2));
    }
    @Test void outsidersAndOtherOrganizationsSeeNothing() throws Exception {
        Ctx c = setup();
        create(c, "Secret");
        var eve = signUp("Eve", "eve@example.com");
        eve.get(c.path()).andExpect(status().isNotFound());
        eve.get(c.path() + "/1").andExpect(status().isNotFound());
        eve.post(c.path(), Map.of("title", "Hack")).andExpect(status().isNotFound());
        eve.put(c.path() + "/1", Map.of("title", "Hack")).andExpect(status().isNotFound());
        String evesOrg = eve.createOrganization("Evil", "evil");
        // Her own organization with someone else's project id must not leak it.
        eve.get("/api/v1/organizations/" + evesOrg + "/projects/" + c.project() + "/issues").andExpect(status().isNotFound());
        c.ada().get(c.path() + "/99").andExpect(status().isNotFound());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(c.path())).andExpect(status().isUnauthorized());
    }
    @Test void membersOfAnyRoleCanWorkOnIssues() throws Exception {
        Ctx c = setup();
        var bob = signUp("Bob", "bob@example.com");
        addMember(c.org(), "bob@example.com", "MEMBER");
        bob.post(c.path(), Map.of("title", "From Bob")).andExpect(status().isCreated()).andExpect(jsonPath("$.createdBy.name").value("Bob"));
        bob.put(c.path() + "/1/status", Map.of("status", "DONE")).andExpect(status().isOk());
    }
    @Test void editRejectsInvalidContentAndKeepsIdentity() throws Exception {
        Ctx c = setup();
        create(c, "Original");
        var created = c.ada().json(c.ada().get(c.path() + "/1"));
        c.ada().put(c.path() + "/1", Map.of("title", "   ")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.title").exists());
        c.ada().put(c.path() + "/1", Map.of("title", "x".repeat(201))).andExpect(status().isBadRequest());
        c.ada().put(c.path() + "/1", Map.of("title", "ok", "description", "x".repeat(5001))).andExpect(status().isBadRequest());
        c.ada().post(c.path(), Map.of("title", "")).andExpect(status().isBadRequest());
        var bob = signUp("Bob", "bob@example.com");
        addMember(c.org(), "bob@example.com", "MEMBER");
        bob.put(c.path() + "/1", Map.of("title", "Renamed", "description", "New"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Renamed")).andExpect(jsonPath("$.description").value("New"))
                .andExpect(jsonPath("$.number").value(1)).andExpect(jsonPath("$.projectId").value(c.project()))
                .andExpect(jsonPath("$.createdBy.name").value("Ada")).andExpect(jsonPath("$.createdAt").value(created.get("createdAt").asText()));
        bob.put(c.path() + "/1", Map.of("title", "No description")).andExpect(jsonPath("$.description").doesNotExist());
    }
    @Test void assigneeMustBeAnOrganizationMemberAndCanBeCleared() throws Exception {
        Ctx c = setup();
        create(c, "Task");
        signUp("Bob", "bob@example.com");
        signUp("Eve", "eve@example.com");
        addMember(c.org(), "bob@example.com", "MEMBER");
        c.ada().put(c.path() + "/1/assignee", Map.of("assigneeId", userId("bob@example.com"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.assignee.name").value("Bob"));
        c.ada().put(c.path() + "/1/assignee", Map.of("assigneeId", userId("eve@example.com"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.assigneeId").exists());
        c.ada().put(c.path() + "/1/assignee", Map.of("assigneeId", UUID.randomUUID().toString())).andExpect(status().isBadRequest());
        c.ada().get(c.path() + "/1").andExpect(jsonPath("$.assignee.name").value("Bob"));
        c.ada().put(c.path() + "/1/assignee", new HashMap<String, Object>() {{ put("assigneeId", null); }}).andExpect(status().isOk())
                .andExpect(jsonPath("$.assignee").doesNotExist());
        c.ada().post(c.path(), Map.of("title", "Assigned at creation", "assigneeId", userId("bob@example.com"))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignee.name").value("Bob"));
        c.ada().post(c.path(), Map.of("title", "Bad", "assigneeId", userId("eve@example.com"))).andExpect(status().isBadRequest());
        c.ada().get(c.path()).andExpect(jsonPath("$.totalItems").value(2));
    }
    @Test void statusAndPriorityAreValidatedAndPersisted() throws Exception {
        Ctx c = setup();
        create(c, "Task");
        c.ada().put(c.path() + "/1/status", Map.of("status", "IN_PROGRESS")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        c.ada().put(c.path() + "/1/priority", Map.of("priority", "URGENT")).andExpect(status().isOk()).andExpect(jsonPath("$.priority").value("URGENT"));
        c.ada().get(c.path() + "/1").andExpect(jsonPath("$.status").value("IN_PROGRESS")).andExpect(jsonPath("$.priority").value("URGENT"));
        c.ada().put(c.path() + "/1/status", Map.of("status", "BLOCKED")).andExpect(status().isBadRequest());
        c.ada().put(c.path() + "/1/priority", Map.of("priority", "WHENEVER")).andExpect(status().isBadRequest());
        c.ada().put(c.path() + "/1/status", Map.of()).andExpect(status().isBadRequest());
        c.ada().post(c.path(), Map.of("title", "Pri", "priority", "HIGH")).andExpect(jsonPath("$.priority").value("HIGH"));
    }
    @Test void archivedProjectsKeepIssuesReadableButLocked() throws Exception {
        Ctx c = setup();
        create(c, "Task");
        c.ada().post("/api/v1/organizations/" + c.org() + "/projects/" + c.project() + "/archive", null).andExpect(status().isOk());
        c.ada().get(c.path() + "/1").andExpect(status().isOk());
        c.ada().post(c.path(), Map.of("title", "New")).andExpect(status().isConflict());
        c.ada().put(c.path() + "/1", Map.of("title", "Edit")).andExpect(status().isConflict());
        c.ada().put(c.path() + "/1/status", Map.of("status", "DONE")).andExpect(status().isConflict());
    }
    @Test void paginationAndOrderAreStableAndBounded() throws Exception {
        Ctx c = setup();
        for (int i = 1; i <= 7; i++) create(c, i % 2 == 0 ? "Same title" : "Title " + i);
        List<Integer> seen = new ArrayList<>();
        for (int page = 0; page < 3; page++) {
            var json = c.ada().json(c.ada().get(c.path() + "?size=3&page=" + page + "&sort=TITLE&direction=asc").andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalPages").value(3)).andExpect(jsonPath("$.totalItems").value(7)));
            json.get("items").forEach(item -> seen.add(item.get("number").asInt()));
        }
        org.assertj.core.api.Assertions.assertThat(seen).hasSize(7).doesNotHaveDuplicates();
        // Ties on the title fall back to the number, so the order is the same on every request.
        org.assertj.core.api.Assertions.assertThat(seen.subList(0, 3)).containsExactly(2, 4, 6);
        c.ada().get(c.path()).andExpect(jsonPath("$.items[0].number").value(7));
        c.ada().get(c.path() + "?direction=asc").andExpect(jsonPath("$.items[0].number").value(1));
        c.ada().get(c.path() + "?size=1000").andExpect(jsonPath("$.size").value(100));
        c.ada().get(c.path() + "?sort=password").andExpect(status().isBadRequest());
    }
    @Test void filtersCombineAndNeverCrossProjects() throws Exception {
        Ctx c = setup();
        String other = c.ada().json(c.ada().post("/api/v1/organizations/" + c.org() + "/projects", Map.of("key", "OTHER", "name", "Other")).andExpect(status().isCreated())).get("id").asText();
        String otherPath = "/api/v1/organizations/" + c.org() + "/projects/" + other + "/issues";
        signUp("Bob", "bob@example.com");
        addMember(c.org(), "bob@example.com", "MEMBER");
        String bob = userId("bob@example.com");
        for (String t : new String[] {"A", "B", "C", "D"}) create(c, t);
        c.ada().post(otherPath, Map.of("title", "Elsewhere", "priority", "HIGH")).andExpect(status().isCreated());
        c.ada().put(c.path() + "/1/status", Map.of("status", "DONE"));
        c.ada().put(c.path() + "/2/status", Map.of("status", "DONE"));
        c.ada().put(c.path() + "/2/priority", Map.of("priority", "HIGH"));
        c.ada().put(c.path() + "/2/assignee", Map.of("assigneeId", bob));
        c.ada().put(c.path() + "/3/priority", Map.of("priority", "HIGH"));
        c.ada().get(c.path() + "?status=DONE").andExpect(jsonPath("$.totalItems").value(2));
        c.ada().get(c.path() + "?status=DONE&priority=HIGH").andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].number").value(2));
        c.ada().get(c.path() + "?priority=HIGH").andExpect(jsonPath("$.totalItems").value(2));
        c.ada().get(c.path() + "?assignee=" + bob).andExpect(jsonPath("$.totalItems").value(1));
        c.ada().get(c.path() + "?assignee=none").andExpect(jsonPath("$.totalItems").value(3));
        c.ada().get(c.path() + "?assignee=" + bob + "&status=TODO").andExpect(jsonPath("$.totalItems").value(0));
        c.ada().get(c.path() + "?assignee=nope").andExpect(status().isBadRequest());
        c.ada().get(c.path() + "?status=BLOCKED").andExpect(status().isBadRequest());
        c.ada().get(otherPath).andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].identifier").value("OTHER-1"));
    }
}
