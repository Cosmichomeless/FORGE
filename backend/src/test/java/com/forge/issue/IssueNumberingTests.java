package com.forge.issue;

import com.forge.common.ApiException;
import com.forge.organization.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Project-local numbering (issue #32). */
class IssueNumberingTests extends ApiTestSupport {
    @Autowired IssueService issues;
    @Autowired TransactionTemplate tx;

    private record Setup(UUID userId, String organizationId, UUID projectId) {}
    private Setup project(String organizationName, String slug, String key) throws Exception {
        var ada = signUp("Ada " + slug, slug + "@example.com");
        String organizationId = ada.createOrganization(organizationName, slug);
        String projectId = ada.json(ada.post("/api/v1/organizations/" + organizationId + "/projects", Map.of("key", key, "name", key))
                .andExpect(status().isCreated())).get("id").asText();
        return new Setup(UUID.fromString(userId(slug + "@example.com")), organizationId, UUID.fromString(projectId));
    }
    private long counter(UUID projectId) { return jdbc.queryForObject("select last_issue_number from projects where id = ?::uuid", Long.class, projectId.toString()); }

    @Test void numbersStartAtOneAndFormTheIdentifier() throws Exception {
        Setup s = project("Acme", "acme", "FORGE");
        var first = issues.create(s.projectId(), s.userId(), "First", null);
        var second = issues.create(s.projectId(), s.userId(), "Second", "Details");
        assertThat(first.number()).isEqualTo(1);
        assertThat(first.identifier()).isEqualTo("FORGE-1");
        assertThat(second.identifier()).isEqualTo("FORGE-2");
        assertThat(counter(s.projectId())).isEqualTo(2);
    }
    @Test void projectsNumberIndependentlyAndKeysMayRepeatAcrossOrganizations() throws Exception {
        Setup acme = project("Acme", "acme", "FORGE");
        Setup globex = project("Globex", "globex", "FORGE");
        issues.create(acme.projectId(), acme.userId(), "A1", null);
        issues.create(acme.projectId(), acme.userId(), "A2", null);
        assertThat(issues.create(globex.projectId(), globex.userId(), "G1", null).identifier()).isEqualTo("FORGE-1");
        assertThat(issues.create(acme.projectId(), acme.userId(), "A3", null).identifier()).isEqualTo("FORGE-3");
    }
    @Test void numbersAreNotDerivedFromMaxSoDeletionsNeverCauseReuse() throws Exception {
        Setup s = project("Acme", "acme", "FORGE");
        for (int i = 0; i < 3; i++) issues.create(s.projectId(), s.userId(), "Issue " + i, null);
        jdbc.update("delete from issues where project_id = ?::uuid and issue_number = 3", s.projectId().toString());
        assertThat(issues.create(s.projectId(), s.userId(), "After delete", null).number()).isEqualTo(4);
    }
    @Test void theDatabaseRejectsADuplicateProjectNumberPair() throws Exception {
        Setup s = project("Acme", "acme", "FORGE");
        issues.create(s.projectId(), s.userId(), "First", null);
        assertThatThrownBy(() -> jdbc.update("insert into issues (id, project_id, issue_number, title, created_by, created_at) values (?::uuid, ?::uuid, 1, 'Dup', ?::uuid, current_timestamp)",
                UUID.randomUUID().toString(), s.projectId().toString(), s.userId().toString()))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void concurrentCreationsGetDistinctGapFreeNumbers() throws Exception {
        Setup s = project("Acme", "acme", "FORGE");
        int tasks = 12;
        ExecutorService pool = Executors.newFixedThreadPool(tasks);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Long>> results = new ArrayList<>();
        for (int i = 0; i < tasks; i++) {
            int n = i;
            results.add(pool.submit(() -> { start.await(); return issues.create(s.projectId(), s.userId(), "Concurrent " + n, null).number(); }));
        }
        start.countDown();
        Set<Long> numbers = new TreeSet<>();
        for (Future<Long> result : results) numbers.add(result.get(30, TimeUnit.SECONDS));
        pool.shutdown();
        assertThat(numbers).hasSize(tasks).containsExactlyElementsOf(java.util.stream.LongStream.rangeClosed(1, tasks).boxed().toList());
        assertThat(counter(s.projectId())).isEqualTo(tasks);
        assertThat(jdbc.queryForObject("select count(*) from issues where project_id = ?::uuid", Integer.class, s.projectId().toString())).isEqualTo(tasks);
    }
    @Test void aRolledBackCreationDoesNotBurnANumber() throws Exception {
        Setup s = project("Acme", "acme", "FORGE");
        issues.create(s.projectId(), s.userId(), "First", null);
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
            issues.create(s.projectId(), s.userId(), "Doomed", null);
            throw new IllegalStateException("abort");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(counter(s.projectId())).isEqualTo(1);
        assertThat(issues.create(s.projectId(), s.userId(), "Second", null).number()).isEqualTo(2);
    }
    @Test void archivedOrMissingProjectsDoNotAcceptIssues() throws Exception {
        Setup s = project("Acme", "acme", "FORGE");
        var ada = signUp("Ada2", "ada2@example.com");
        jdbc.update("update projects set status = 'ARCHIVED', archived_at = current_timestamp where id = ?::uuid", s.projectId().toString());
        assertThatThrownBy(() -> issues.create(s.projectId(), s.userId(), "Nope", null)).isInstanceOf(ApiException.class).extracting(e -> ((ApiException) e).status()).isEqualTo(409);
        assertThatThrownBy(() -> issues.create(UUID.randomUUID(), s.userId(), "Nope", null)).isInstanceOf(ApiException.class).extracting(e -> ((ApiException) e).status()).isEqualTo(404);
        assertThat(counter(s.projectId())).isZero();
    }
}
