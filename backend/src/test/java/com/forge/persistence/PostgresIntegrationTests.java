package com.forge.persistence;

import com.forge.organization.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Runs the real Flyway migrations against a real PostgreSQL (issue #53). H2 in PostgreSQL mode is
 * forgiving in places where PostgreSQL is not, so constraints and queries are re-checked here.
 * Skipped automatically when no Docker daemon is available.
 */
@Testcontainers(disabledWithoutDocker = true)
class PostgresIntegrationTests extends ApiTestSupport {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @DynamicPropertySource static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private String project(Client c, String org, String key) throws Exception {
        return c.json(c.post("/api/v1/organizations/" + org + "/projects", Map.of("key", key, "name", key + " project")).andExpect(status().isCreated())).get("id").asText();
    }
    private String issues(String org, String project) { return "/api/v1/organizations/" + org + "/projects/" + project + "/issues"; }

    @Test void flywayAppliedEveryMigrationOnPostgres() {
        assertThat(jdbc.queryForObject("select version() ", String.class)).containsIgnoringCase("postgresql");
        List<String> failed = jdbc.queryForList("select version from flyway_schema_history where success = false", String.class);
        assertThat(failed).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from flyway_schema_history where success = true", Integer.class)).isGreaterThanOrEqualTo(9);
    }

    @Test void databaseConstraintsRejectInvalidRows() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        String project = project(ada, org, "FORGE");
        issueRow(project, userId("ada@example.com"), 1, "TODO", "LOW");

        assertViolation("uq_issues_project_number", () -> issueRow(project, userId("ada@example.com"), 1, "TODO", "LOW"));
        assertViolation("ck_issues_number_positive", () -> issueRow(project, userId("ada@example.com"), 0, "TODO", "LOW"));
        assertViolation("ck_issues_status", () -> issueRow(project, userId("ada@example.com"), 2, "BLOCKED", "LOW"));
        assertViolation("ck_issues_priority", () -> issueRow(project, userId("ada@example.com"), 3, "TODO", "CRITICAL"));
        assertViolation("uq_projects_organization_key", () -> projectRow(org, "FORGE", userId("ada@example.com")));
        assertViolation("ck_projects_key_normalized", () -> projectRow(org, "forge2", userId("ada@example.com")));
        assertViolation("ck_projects_key_normalized", () -> projectRow(org, "X", userId("ada@example.com")));
    }

    @Test void sameKeyIsAllowedInDifferentOrganizations() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        var eve = signUp("Eve", "eve@example.com");
        String one = project(ada, ada.createOrganization("Acme", "acme"), "WEB");
        String two = project(eve, eve.createOrganization("Evil", "evil"), "WEB");
        assertThat(one).isNotEqualTo(two);
    }

    @Test void filterAndSearchQueriesWorkOnPostgres() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        String p = project(ada, org, "FORGE");
        for (String title : List.of("Login page broken", "Improve LOGIN speed", "Unrelated 100% task", "Snake_case name"))
            ada.post(issues(org, p), Map.of("title", title)).andExpect(status().isCreated());
        ada.put(issues(org, p) + "/1/status", Map.of("status", "DONE")).andExpect(status().isOk());

        ada.get(issues(org, p) + "?q=login").andExpect(jsonPath("$.totalItems").value(2));          // case-insensitive
        ada.get(issues(org, p) + "?q=forge-3").andExpect(jsonPath("$.items[0].identifier").value("FORGE-3"));
        ada.get(issues(org, p) + "?q=%").andExpect(jsonPath("$.totalItems").value(1));              // literal percent
        ada.get(issues(org, p) + "?q=_").andExpect(jsonPath("$.totalItems").value(1));              // literal underscore
        ada.get(issues(org, p) + "?q=login&status=DONE").andExpect(jsonPath("$.totalItems").value(1));
        ada.get(issues(org, p) + "?status=TODO").andExpect(jsonPath("$.totalItems").value(3));
        ada.get("/api/v1/organizations/" + org + "/issues?q=login").andExpect(jsonPath("$.totalItems").value(2));
        ada.get("/api/v1/me/dashboard").andExpect(status().isOk());
    }

    @Test void concurrentCreationNeverRepeatsAnIssueNumber() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        String p = project(ada, org, "FORGE");
        int total = 12;
        var pool = Executors.newFixedThreadPool(6);
        List<Future<Integer>> results = new ArrayList<>();
        for (int i = 0; i < total; i++) {
            final int n = i;
            Callable<Integer> task = () -> ada.post(issues(org, p), Map.of("title", "Concurrent " + n)).andReturn().getResponse().getStatus();
            results.add(pool.submit(task));
        }
        for (Future<Integer> f : results) assertThat(f.get()).isEqualTo(201);
        pool.shutdown();
        List<Long> numbers = jdbc.queryForList("select issue_number from issues order by issue_number", Long.class);
        assertThat(numbers).hasSize(total).doesNotHaveDuplicates().first().isEqualTo(1L);
        assertThat(numbers.get(total - 1)).isEqualTo(total);
    }

    @Test void activityKeepsInsertionOrderEvenWithinOneTransaction() throws Exception {
        var ada = signUp("Ada", "ada@example.com");
        String org = ada.createOrganization("Acme", "acme");
        String p = project(ada, org, "FORGE");
        ada.post(issues(org, p), Map.of("title", "Ordered", "priority", "HIGH", "assigneeId", userId("ada@example.com"))).andExpect(status().isCreated());
        ada.get(issues(org, p) + "/1/activity").andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("CREATED"))
                .andExpect(jsonPath("$[*].type", hasItem("ASSIGNED")));
    }

    private void issueRow(String project, String user, long number, String status, String priority) {
        jdbc.update("insert into issues (id, project_id, issue_number, title, created_by, created_at, updated_at, status, priority) values (?::uuid, ?::uuid, ?, 'row', ?::uuid, current_timestamp, current_timestamp, ?, ?)",
                UUID.randomUUID().toString(), project, number, user, status, priority);
    }
    private void projectRow(String org, String key, String user) {
        jdbc.update("insert into projects (id, organization_id, project_key, name, status, created_by, created_at, updated_at) values (?::uuid, ?::uuid, ?, 'row', 'ACTIVE', ?::uuid, current_timestamp, current_timestamp)",
                UUID.randomUUID().toString(), org, key, user);
    }
    private void assertViolation(String constraint, org.junit.jupiter.api.function.Executable insert) {
        assertThatThrownBy(insert::execute).isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining(constraint);
    }
}
