package com.forge.organization;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invitation i where i.tokenHash = :hash")
    Optional<Invitation> findByTokenHashForUpdate(@Param("hash") String hash);

    @Query("select i from Invitation i where i.organizationId = :organizationId and i.acceptedAt is null and i.expiresAt > :now order by i.createdAt, i.id")
    List<Invitation> findPending(@Param("organizationId") UUID organizationId, @Param("now") Instant now);

    @Query("select count(i) > 0 from Invitation i where i.organizationId = :organizationId and i.email = :email and i.acceptedAt is null and i.expiresAt > :now")
    boolean existsPending(@Param("organizationId") UUID organizationId, @Param("email") String email, @Param("now") Instant now);

    @Modifying
    @Query("delete from Invitation i where i.organizationId = :organizationId and i.email = :email and i.acceptedAt is null and i.expiresAt <= :now")
    void deleteExpired(@Param("organizationId") UUID organizationId, @Param("email") String email, @Param("now") Instant now);

    Optional<Invitation> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
