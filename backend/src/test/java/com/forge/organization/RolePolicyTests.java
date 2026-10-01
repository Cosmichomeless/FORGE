package com.forge.organization;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * RBAC matrix (issue #52): one row per operation, one expectation per role. A broken rule fails with the role and
 * operation in the assertion message, so the offending policy is obvious from the report.
 */
class RolePolicyTests extends ApiTestSupport {
    private record Ctx(Client owner, Client admin, Client member, Client outsider, String org, String project) {}
    private Ctx setup() throws Exception {
        var owner = signUp("Olive", "owner@example.com");
        String org = owner.createOrganization("Acme", "acme");
        var admin = signUp("Adam", "admin@example.com");
        var member = signUp("Mia", "member@example.com");
        var outsider = signUp("Eve", "eve@example.com");
        addMember(org, "admin@example.com", "ADMIN");
        addMember(org, "member@example.com", "MEMBER");
        String project = owner.json(owner.post("/api/v1/organizations/" + org + "/projects", Map.of("key", "FORGE", "name", "Forge")).andExpect(status().isCreated())).get("id").asText();
        owner.post("/api/v1/organizations/" + org + "/projects/" + project + "/issues", Map.of("title", "Task")).andExpect(status().isCreated());
        return new Ctx(owner, admin, member, outsider, org, project);
    }
    private static void expect(String role, String operation, int expected, org.springframework.test.web.servlet.ResultActions result) throws Exception {
        int actual = result.andReturn().getResponse().getStatus();
        if (actual != expected) throw new AssertionError(role + " " + operation + ": expected HTTP " + expected + " but was " + actual);
    }

    @Test void managementOperationsRequireOwnerOrAdmin() throws Exception {
        Ctx c = setup();
        String orgPath = "/api/v1/organizations/" + c.org();
        var roles = Map.of("OWNER", c.owner(), "ADMIN", c.admin(), "MEMBER", c.member());
        for (var e : roles.entrySet()) {
            boolean manager = !e.getKey().equals("MEMBER");
            var who = e.getValue();
            expect(e.getKey(), "rename organization", manager ? 200 : 403, who.put(orgPath, Map.of("name", "Acme " + e.getKey(), "slug", "acme")));
            expect(e.getKey(), "invite", manager ? 201 : 403, who.post(orgPath + "/invitations", Map.of("email", e.getKey().toLowerCase() + "-new@example.com", "role", "MEMBER")));
            expect(e.getKey(), "list invitations", manager ? 200 : 403, who.get(orgPath + "/invitations"));
            expect(e.getKey(), "create project", manager ? 201 : 403, who.post(orgPath + "/projects", Map.of("key", "P" + e.getKey().charAt(0), "name", "P " + e.getKey())));
            expect(e.getKey(), "archive project", manager ? 200 : 403, who.post(orgPath + "/projects/" + c.project() + "/archive", Map.of()));
            expect(e.getKey(), "restore project", manager ? 200 : 403, who.post(orgPath + "/projects/" + c.project() + "/restore", Map.of()));
        }
    }
    @Test void everyMemberCanReadAndWorkOnIssuesButOutsidersGetNotFound() throws Exception {
        Ctx c = setup();
        String issues = "/api/v1/organizations/" + c.org() + "/projects/" + c.project() + "/issues";
        var roles = Map.of("OWNER", c.owner(), "ADMIN", c.admin(), "MEMBER", c.member());
        for (var e : roles.entrySet()) {
            var who = e.getValue();
            expect(e.getKey(), "list members", 200, who.get("/api/v1/organizations/" + c.org() + "/members"));
            expect(e.getKey(), "create issue", 201, who.post(issues, Map.of("title", "By " + e.getKey())));
            expect(e.getKey(), "change status", 200, who.put(issues + "/1/status", Map.of("status", "DONE")));
            expect(e.getKey(), "comment", 201, who.post(issues + "/1/comments", Map.of("body", "hi")));
            expect(e.getKey(), "read activity", 200, who.get(issues + "/1/activity"));
        }
        var eve = c.outsider();
        expect("OUTSIDER", "list members", 404, eve.get("/api/v1/organizations/" + c.org() + "/members"));
        expect("OUTSIDER", "list issues", 404, eve.get(issues));
        expect("OUTSIDER", "create issue", 404, eve.post(issues, Map.of("title", "x")));
        expect("OUTSIDER", "assign", 404, eve.put(issues + "/1/assignee", Map.of("assigneeId", userId("eve@example.com"))));
        expect("OUTSIDER", "read activity", 404, eve.get(issues + "/1/activity"));
    }
    @Test void assigningRequiresAnOrganizationMember() throws Exception {
        Ctx c = setup();
        String issues = "/api/v1/organizations/" + c.org() + "/projects/" + c.project() + "/issues/1/assignee";
        expect("MEMBER", "assign to member", 200, c.member().put(issues, Map.of("assigneeId", userId("admin@example.com"))));
        expect("MEMBER", "assign to outsider", 400, c.member().put(issues, Map.of("assigneeId", userId("eve@example.com"))));
    }
}
