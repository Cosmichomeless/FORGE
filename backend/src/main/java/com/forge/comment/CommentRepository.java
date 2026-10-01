package com.forge.comment;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
    List<Comment> findByIssueIdOrderByCreatedAtAscIdAsc(UUID issueId);
    Optional<Comment> findByIdAndIssueId(UUID id, UUID issueId);
}
