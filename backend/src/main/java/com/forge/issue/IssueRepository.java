package com.forge.issue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface IssueRepository extends JpaRepository<Issue, UUID>, JpaSpecificationExecutor<Issue> {
    Optional<Issue> findByProjectIdAndNumber(UUID projectId, long number);

    @Query("select i.status, count(i) from Issue i where i.assigneeId = :userId and i.projectId in :projectIds group by i.status")
    List<Object[]> countByStatusAssignedTo(@Param("userId") UUID userId, @Param("projectIds") Collection<UUID> projectIds);

    /** Most recently touched projects among the given ones: [projectId, last issue update]. */
    @Query("select i.projectId, max(i.updatedAt) from Issue i where i.projectId in :projectIds group by i.projectId order by max(i.updatedAt) desc")
    List<Object[]> recentProjects(@Param("projectIds") Collection<UUID> projectIds, org.springframework.data.domain.Pageable page);
}
