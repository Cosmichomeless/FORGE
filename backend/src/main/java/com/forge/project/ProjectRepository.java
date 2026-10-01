package com.forge.project;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    boolean existsByOrganizationIdAndKey(UUID organizationId, String key);
    boolean existsByIdAndOrganizationId(UUID id, UUID organizationId);
    Optional<Project> findByIdAndOrganizationId(UUID id, UUID organizationId);
    Optional<Project> findByOrganizationIdAndKey(UUID organizationId, String key);

    @Query("select p from Project p where p.organizationId = :organizationId order by lower(p.name), p.id")
    List<Project> findAllInOrganization(@Param("organizationId") UUID organizationId);

    @Query("select p from Project p where p.organizationId = :organizationId and p.status = :status order by lower(p.name), p.id")
    List<Project> findAllInOrganizationWithStatus(@Param("organizationId") UUID organizationId, @Param("status") ProjectStatus status);

    /** Serializes edits, archiving and issue numbering of one project. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Project p where p.id = :id")
    Optional<Project> findForUpdate(@Param("id") UUID id);
}
