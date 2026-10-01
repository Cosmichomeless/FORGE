package com.forge.organization;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Cross-organization isolation, role boundaries and concurrency edge cases (issue #25). */
class OrganizationSecurityTests extends ApiTestSupport {
    private String snapshot() {
        return jdbc.queryForList("select name, slug from organizations order by slug").toString()
                + jdbc.queryForList("select user_id, role from memberships order by user_id, organization_id").toString()
                + jdbc.queryForList("select email, role, accepted_at from invitations order by email").toString();
    }
    private <T> List<T> runConcurrently(List<Callable<T>> tasks) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(tasks.size());
        CountDownLatch ready = new CountDownLatch(tasks.size());
        CountDownLatch go = new CountDownLatch(1);
        try {
            List<Future<T>> futures = new ArrayList<>();
            for (Callable<T> task : tasks) futures.add(pool.submit(() -> { ready.countDown(); go.await(); return task.call(); }));
            ready.await();
            go.countDown();
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) results.add(future.get(60, TimeUnit.SECONDS));
            return results;
        } finally { pool.shutdownNow(); }
    }

    @Test void aUserOfAnotherOrganizationCannotSeeOrChangeForeignData() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        signUp("Cy", "cy@example.com");
        String a = ada.createOrganization("Alpha", "alpha");
        String b = bob.createOrganization("Beta", "beta");
        addMember(a, "cy@example.com", "MEMBER");
        String invitationId = ada.json(ada.post("/api/v1/organizations/" + a + "/invitations", Map.of("email", "new@example.com", "role", "MEMBER"))
                .andExpect(status().isCreated())).get("id").asText();
        String before = snapshot();
        String base = "/api/v1/organizations/" + a;
        bob.get(base).andExpect(status().isNotFound());
        bob.put(base, Map.of("name", "Pwned", "slug", "pwned")).andExpect(status().isNotFound());
        bob.get(base + "/members").andExpect(status().isNotFound());
        bob.put(base + "/members/" + userId("cy@example.com"), Map.of("role", "ADMIN")).andExpect(status().isNotFound());
        bob.put(base + "/members/" + userId("ada@example.com"), Map.of("role", "MEMBER")).andExpect(status().isNotFound());
        bob.delete(base + "/members/" + userId("cy@example.com")).andExpect(status().isNotFound());
        bob.get(base + "/invitations").andExpect(status().isNotFound());
        bob.post(base + "/invitations", Map.of("email", "bob@example.com", "role", "ADMIN")).andExpect(status().isNotFound());
        bob.delete(base + "/invitations/" + invitationId).andExpect(status().isNotFound());
        // Mixing identifiers across organizations must not leak or modify anything either.
        bob.delete("/api/v1/organizations/" + b + "/invitations/" + invitationId).andExpect(status().isNotFound());
        bob.put("/api/v1/organizations/" + b + "/members/" + userId("cy@example.com"), Map.of("role", "ADMIN")).andExpect(status().isNotFound());
        bob.delete("/api/v1/organizations/" + b + "/members/" + userId("ada@example.com")).andExpect(status().isNotFound());
        bob.get("/api/v1/organizations").andExpect(jsonPath("$[0].slug").value("beta")).andExpect(jsonPath("$.length()").value(1));
        assertThat(snapshot()).isEqualTo(before);
    }
    @Test void roleInOneOrganizationGrantsNothingInAnother() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String a = ada.createOrganization("Alpha", "alpha");
        bob.createOrganization("Beta", "beta"); // Bob is OWNER of Beta
        addMember(a, "bob@example.com", "MEMBER"); // but only MEMBER of Alpha
        String before = snapshot();
        bob.put("/api/v1/organizations/" + a, Map.of("name", "Pwned", "slug", "pwned")).andExpect(status().isForbidden());
        bob.post("/api/v1/organizations/" + a + "/invitations", Map.of("email", "x@example.com", "role", "MEMBER")).andExpect(status().isForbidden());
        bob.put("/api/v1/organizations/" + a + "/members/" + userId("bob@example.com"), Map.of("role", "OWNER")).andExpect(status().isForbidden());
        bob.delete("/api/v1/organizations/" + a + "/members/" + userId("ada@example.com")).andExpect(status().isForbidden());
        assertThat(snapshot()).isEqualTo(before);
    }
    @Test void invitationTokensAreOnlyStoredAsHashesAndNeverListed() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String id = ada.createOrganization("Alpha", "alpha");
        String token = ada.json(ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", "x@example.com", "role", "MEMBER"))
                .andExpect(status().isCreated())).get("token").asText();
        assertThat(token).hasSizeGreaterThanOrEqualTo(43);
        assertThat(jdbc.queryForList("select * from invitations").toString()).doesNotContain(token);
        assertThat(ada.get("/api/v1/organizations/" + id + "/invitations").andReturn().getResponse().getContentAsString()).doesNotContain(token);
    }
    @Test void concurrentAcceptsOfOneInvitationCreateASingleMembership() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Alpha", "alpha");
        String token = ada.json(ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", "bob@example.com", "role", "MEMBER"))
                .andExpect(status().isCreated())).get("token").asText();
        List<Callable<Integer>> attempts = new ArrayList<>();
        for (int i = 0; i < 4; i++) attempts.add(() -> bob.post("/api/v1/invitations/accept", Map.of("token", token)).andReturn().getResponse().getStatus());
        List<Integer> statuses = runConcurrently(attempts);
        assertThat(statuses).containsOnlyOnce(200).filteredOn(code -> code != 200).containsOnly(409);
        assertThat(jdbc.queryForObject("select count(*) from memberships where organization_id = ?::uuid", Integer.class, id)).isEqualTo(2);
    }
    @Test void concurrentSelfDemotionsNeverLeaveAnOrganizationWithoutOwner() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Alpha", "alpha");
        addMember(id, "bob@example.com", "OWNER");
        List<Integer> statuses = runConcurrently(List.of(
                () -> ada.put("/api/v1/organizations/" + id + "/members/" + userId("ada@example.com"), Map.of("role", "MEMBER")).andReturn().getResponse().getStatus(),
                () -> bob.put("/api/v1/organizations/" + id + "/members/" + userId("bob@example.com"), Map.of("role", "MEMBER")).andReturn().getResponse().getStatus()));
        assertThat(statuses).containsExactlyInAnyOrder(200, 409);
        assertThat(jdbc.queryForObject("select count(*) from memberships where role = 'OWNER' and organization_id = ?::uuid", Integer.class, id)).isEqualTo(1);
    }
    @Test void concurrentOwnerLeavesNeverLeaveAnOrganizationWithoutOwner() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Alpha", "alpha");
        addMember(id, "bob@example.com", "OWNER");
        List<Integer> statuses = runConcurrently(List.of(
                () -> ada.delete("/api/v1/organizations/" + id + "/members/" + userId("ada@example.com")).andReturn().getResponse().getStatus(),
                () -> bob.delete("/api/v1/organizations/" + id + "/members/" + userId("bob@example.com")).andReturn().getResponse().getStatus()));
        assertThat(statuses).containsExactlyInAnyOrder(204, 409);
        assertThat(jdbc.queryForObject("select count(*) from memberships where role = 'OWNER' and organization_id = ?::uuid", Integer.class, id)).isEqualTo(1);
    }
    @Test void expiredAndUsedInvitationsStayRejectedAfterTheUserLeaves() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var bob = signUp("Bob", "bob@example.com");
        String id = ada.createOrganization("Alpha", "alpha");
        String token = ada.json(ada.post("/api/v1/organizations/" + id + "/invitations", Map.of("email", "bob@example.com", "role", "ADMIN"))
                .andExpect(status().isCreated())).get("token").asText();
        bob.post("/api/v1/invitations/accept", Map.of("token", token)).andExpect(status().isOk());
        bob.delete("/api/v1/organizations/" + id + "/members/" + userId("bob@example.com")).andExpect(status().isNoContent());
        bob.post("/api/v1/invitations/accept", Map.of("token", token)).andExpect(status().isConflict());
        bob.get("/api/v1/organizations/" + id).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("select count(*) from memberships where organization_id = ?::uuid", Integer.class, id)).isEqualTo(1);
    }
}
