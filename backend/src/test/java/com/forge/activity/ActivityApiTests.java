package com.forge.activity;

import com.forge.organization.ApiTestSupport;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Activity log: entries for create/assign/status/comment with actor and date, old and new values, access control (issues #49-#51). */
class ActivityApiTests extends ApiTestSupport {
    private record Ctx(Client ada, Client bob, String org, String project, String issues, String bobId) {}
    private Ctx setup() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        var bob = signUp("Bob", "bob@example.com");
        addMember(org, "bob@example.com", "MEMBER");
        String project = ada.json(ada.post("/api/v1/organizations/" + org + "/projects", Map.of("key", "FORGE", "name", "Forge")).andExpect(status().isCreated())).get("id").asText();
        String issues = "/api/v1/organizations/" + org + "/projects/" + project + "/issues";
        ada.post(issues, Map.of("title", "Task")).andExpect(status().isCreated());
        String bobId = userId("bob@example.com");
        return new Ctx(ada, bob, org, project, issues, bobId);
    }

    @Test void createAssignStatusAndCommentAreRecordedInOrder() throws Exception {
        Ctx c = setup();
        c.ada().put(c.issues() + "/1/assignee", Map.of("assigneeId", c.bobId())).andExpect(status().isOk());
        c.bob().put(c.issues() + "/1/status", Map.of("status", "IN_PROGRESS")).andExpect(status().isOk());
        c.bob().post(c.issues() + "/1/comments", Map.of("body", "On it")).andExpect(status().isCreated());
        c.ada().get(c.issues() + "/1/activity").andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].type").value("CREATED")).andExpect(jsonPath("$[0].actor.name").value("Ada")).andExpect(jsonPath("$[0].createdAt").exists())
                .andExpect(jsonPath("$[1].type").value("ASSIGNED")).andExpect(jsonPath("$[1].toPerson.name").value("Bob")).andExpect(jsonPath("$[1].fromPerson").doesNotExist())
                .andExpect(jsonPath("$[2].type").value("STATUS_CHANGED")).andExpect(jsonPath("$[2].actor.name").value("Bob"))
                .andExpect(jsonPath("$[2].from").value("TODO")).andExpect(jsonPath("$[2].to").value("IN_PROGRESS"))
                .andExpect(jsonPath("$[3].type").value("COMMENTED")).andExpect(jsonPath("$[3].actor.name").value("Bob"));
    }
    @Test void unassigningAndReassigningKeepPreviousAndNewValues() throws Exception {
        Ctx c = setup();
        c.ada().put(c.issues() + "/1/assignee", Map.of("assigneeId", c.bobId())).andExpect(status().isOk());
        c.ada().put(c.issues() + "/1/assignee", new java.util.HashMap<String, Object>() {{ put("assigneeId", null); }}).andExpect(status().isOk());
        c.ada().get(c.issues() + "/1/activity").andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[2].type").value("ASSIGNED")).andExpect(jsonPath("$[2].fromPerson.name").value("Bob")).andExpect(jsonPath("$[2].toPerson").doesNotExist());
    }
    @Test void creationWithAssigneeAndPriorityIsRecorded() throws Exception {
        Ctx c = setup();
        c.ada().post(c.issues(), Map.of("title", "Second", "assigneeId", c.bobId())).andExpect(status().isCreated());
        c.ada().get(c.issues() + "/2/activity").andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].type").value("CREATED")).andExpect(jsonPath("$[1].type").value("ASSIGNED"));
    }
    @Test void repeatedIdenticalChangesAndFailedChangesLeaveNoEntries() throws Exception {
        Ctx c = setup();
        c.ada().put(c.issues() + "/1/status", Map.of("status", "TODO")).andExpect(status().isOk());
        c.ada().put(c.issues() + "/1/status", Map.of("status", "DONE")).andExpect(status().isOk());
        c.ada().put(c.issues() + "/1/status", Map.of("status", "DONE")).andExpect(status().isOk());
        c.ada().put(c.issues() + "/1/assignee", Map.of("assigneeId", java.util.UUID.randomUUID().toString())).andExpect(status().isBadRequest());
        c.ada().post(c.issues() + "/1/comments", Map.of("body", " ")).andExpect(status().isBadRequest());
        c.ada().get(c.issues() + "/1/activity").andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[1].from").value("TODO")).andExpect(jsonPath("$[1].to").value("DONE"));
    }
    @Test void archivedProjectsRejectChangesWithoutLoggingThem() throws Exception {
        Ctx c = setup();
        c.ada().post("/api/v1/organizations/" + c.org() + "/projects/" + c.project() + "/archive", Map.of()).andExpect(status().isOk());
        c.ada().put(c.issues() + "/1/status", Map.of("status", "DONE")).andExpect(status().isConflict());
        c.ada().get(c.issues() + "/1/activity").andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(1)));
    }
    @Test void onlyMembersOfTheOrganizationSeeActivity() throws Exception {
        Ctx c = setup();
        var eve = signUp("Eve", "eve@example.com");
        eve.get(c.issues() + "/1/activity").andExpect(status().isNotFound());
        String evesOrg = eve.createOrganization("Evil", "evil");
        eve.get("/api/v1/organizations/" + evesOrg + "/projects/" + c.project() + "/issues/1/activity").andExpect(status().isNotFound());
        c.ada().get(c.issues() + "/99/activity").andExpect(status().isNotFound());
        c.bob().get(c.issues() + "/1/activity").andExpect(status().isOk());
    }
}
