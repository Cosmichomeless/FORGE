package com.forge.organization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {
    Optional<Membership> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    boolean existsByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    long countByOrganizationIdAndRole(UUID organizationId, Role role);

    @Query("select m from Membership m join fetch m.organization o where m.userId = :userId order by lower(o.name), o.id")
    List<Membership> findAllForUser(@Param("userId") UUID userId);

    @Query("select m from Membership m join fetch m.user where m.organizationId = :organizationId order by m.createdAt, m.id")
    List<Membership> findAllForOrganization(@Param("organizationId") UUID organizationId);
}
