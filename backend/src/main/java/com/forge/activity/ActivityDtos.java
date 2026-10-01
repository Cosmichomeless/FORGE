package com.forge.activity;

import com.forge.issue.IssueDtos.PersonResponse;
import java.time.Instant;
import java.util.UUID;

public final class ActivityDtos {
    private ActivityDtos() {}
    /** For ASSIGNED, from/to are the previous and new assignee (null = unassigned); otherwise they are enum names. */
    public record ActivityResponse(UUID id, ActivityType type, PersonResponse actor, String from, String to, PersonResponse fromPerson,
                                   PersonResponse toPerson, Instant createdAt) {}
}
