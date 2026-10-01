package com.forge.issue;

import com.forge.organization.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import java.util.Map;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Search by key/title, per-project and per-organization, and the personal dashboard (issues #45, #47, #51). */
class IssueSearchTests extends ApiTestSupport {
    private String project(Client c, String org, String key) throws Exception {
        return c.json(c.post("/api/v1/organizations/" + org + "/projects", Map.of("key", key, "name", key + " project")).andExpect(status().isCreated())).get("id").asText();
    }
    private String issues(String org, String project) { return "/api/v1/organizations/" + org + "/projects/" + project + "/issues"; }
    private void issue(Client c, String org, String project, String title) throws Exception { c.post(issues(org, project), Map.of("title", title)).andExpect(status().isCreated()); }

    @Test void projectSearchMatchesExactKeyAndTitleText() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        String p = project(ada, org, "FORGE");
        issue(ada, org, p, "Login page broken");
        issue(ada, org, p, "Improve LOGIN speed");
        issue(ada, org, p, "Unrelated 100% task");
        ada.get(issues(org, p) + "?q=forge-3").andExpect(jsonPath("$.items", hasSize(1))).andExpect(jsonPath("$.items[0].identifier").value("FORGE-3"));
        ada.get(issues(org, p) + "?q=login&sort=NUMBER&direction=asc").andExpect(jsonPath("$.totalItems").value(2)).andExpect(jsonPath("$.items[0].number").value(1));
        ada.get(issues(org, p) + "?q=%").andExpect(jsonPath("$.totalItems").value(1));          // a literal percent sign, not a wildcard
        ada.get(issues(org, p) + "?q=_").andExpect(jsonPath("$.totalItems").value(0));
        ada.get(issues(org, p) + "?q=nothing-here").andExpect(jsonPath("$.totalItems").value(0));
        ada.get(issues(org, p) + "?q=OTHER-1").andExpect(jsonPath("$.totalItems").value(0));      // key of another project does not match
        ada.get(issues(org, p) + "?q=  ").andExpect(jsonPath("$.totalItems").value(3));        // blank search means no search
        ada.put(issues(org, p) + "/1/status", Map.of("status", "DONE")).andExpect(status().isOk());
        ada.get(issues(org, p) + "?q=login&status=DONE").andExpect(jsonPath("$.totalItems").value(1));
    }
    @Test void organizationSearchSpansProjectsButNeverOtherOrganizations() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        String web = project(ada, org, "WEB"), api = project(ada, org, "API");
        issue(ada, org, web, "Payments form");
        issue(ada, org, api, "Payments endpoint");
        var eve = signUp("Eve", "eve@example.com");
        String evil = eve.createOrganization("Evil", "evil");
        String evilWeb = project(eve, evil, "WEB");          // same key as Ada's project
        issue(eve, evil, evilWeb, "Payments secret");
        String search = "/api/v1/organizations/" + org + "/issues";
        ada.get(search + "?q=payments").andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Payments secret"))));
        ada.get(search + "?q=web-1").andExpect(jsonPath("$.totalItems").value(1)).andExpect(jsonPath("$.items[0].title").value("Payments form"));
        ada.get(search + "?q=api-1").andExpect(jsonPath("$.items[0].identifier").value("API-1"));
        ada.get(search).andExpect(jsonPath("$.totalItems").value(0));                              // no query, no results
        eve.get(search + "?q=payments").andExpect(status().isNotFound());                          // outsider
        eve.get("/api/v1/organizations/" + evil + "/issues?q=payments").andExpect(jsonPath("$.totalItems").value(1));
    }
    @Test void dashboardIsPersonalAndSkipsArchivedProjects() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        var bob = signUp("Bob", "bob@example.com");
        addMember(org, "bob@example.com", "MEMBER");
        String web = project(ada, org, "WEB"), old = project(ada, org, "OLD");
        String adaId = userId("ada@example.com"), bobId = userId("bob@example.com");
        for (String t : new String[]{"One", "Two", "Three"}) issue(ada, org, web, t);
        issue(ada, org, old, "Legacy");
        ada.put(issues(org, web) + "/1/assignee", Map.of("assigneeId", adaId)).andExpect(status().isOk());
        ada.put(issues(org, web) + "/2/assignee", Map.of("assigneeId", adaId)).andExpect(status().isOk());
        ada.put(issues(org, web) + "/2/status", Map.of("status", "DONE")).andExpect(status().isOk());
        ada.put(issues(org, web) + "/3/assignee", Map.of("assigneeId", bobId)).andExpect(status().isOk());
        ada.put(issues(org, old) + "/1/assignee", Map.of("assigneeId", adaId)).andExpect(status().isOk());
        ada.post("/api/v1/organizations/" + org + "/projects/" + old + "/archive", Map.of()).andExpect(status().isOk());

        ada.get("/api/v1/me/dashboard").andExpect(status().isOk())
                .andExpect(jsonPath("$.assigned", hasSize(1))).andExpect(jsonPath("$.assigned[0].issue.identifier").value("WEB-1"))
                .andExpect(jsonPath("$.assigned[0].organizationId").value(org)).andExpect(jsonPath("$.assigned[0].projectName").value("WEB project"))
                .andExpect(jsonPath("$.counts.TODO").value(1)).andExpect(jsonPath("$.counts.IN_PROGRESS").value(0)).andExpect(jsonPath("$.counts.DONE").value(1))
                .andExpect(jsonPath("$.recentProjects", hasSize(1))).andExpect(jsonPath("$.recentProjects[0].key").value("WEB"));
        bob.get("/api/v1/me/dashboard").andExpect(jsonPath("$.assigned", hasSize(1))).andExpect(jsonPath("$.assigned[0].issue.identifier").value("WEB-3"))
                .andExpect(jsonPath("$.counts.TODO").value(1)).andExpect(jsonPath("$.counts.DONE").value(0));
        var eve = signUp("Eve", "eve@example.com");
        eve.get("/api/v1/me/dashboard").andExpect(jsonPath("$.assigned", hasSize(0))).andExpect(jsonPath("$.counts.TODO").value(0)).andExpect(jsonPath("$.recentProjects", hasSize(0)));
        mvc.perform(MockMvcRequestBuilders.get("/api/v1/me/dashboard")).andExpect(status().isUnauthorized());
    }
    @Test void dashboardCoversEveryOrganizationOfTheUser() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String one = ada.createOrganization("One", "one"), two = ada.createOrganization("Two", "two");
        String p1 = project(ada, one, "AAA"), p2 = project(ada, two, "BBB");
        issue(ada, one, p1, "First"); issue(ada, two, p2, "Second");
        ada.put(issues(one, p1) + "/1/assignee", Map.of("assigneeId", userId("ada@example.com"))).andExpect(status().isOk());
        ada.put(issues(two, p2) + "/1/assignee", Map.of("assigneeId", userId("ada@example.com"))).andExpect(status().isOk());
        ada.get("/api/v1/me/dashboard").andExpect(jsonPath("$.assigned", hasSize(2))).andExpect(jsonPath("$.counts.TODO").value(2))
                .andExpect(jsonPath("$.assigned[0].issue.identifier").value("BBB-1")).andExpect(jsonPath("$.recentProjects", hasSize(2)))
                .andExpect(jsonPath("$.recentProjects[0].organizationName").value("Two"));
    }
}
