package com.forge.issue;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface IssueRepository extends JpaRepository<Issue, UUID> {
}
