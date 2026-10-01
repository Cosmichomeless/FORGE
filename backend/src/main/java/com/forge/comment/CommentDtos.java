package com.forge.comment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class CommentDtos {
    private CommentDtos() {}
    public record CommentRequest(@NotBlank @Size(max = 5000) String body) {
        public CommentRequest { body = body == null ? null : body.trim(); }
    }
    public record AuthorResponse(UUID id, String name) {}
    /** canEdit/canDelete tell the UI what the caller may do, using the same rules the API enforces. */
    public record CommentResponse(UUID id, UUID issueId, String body, AuthorResponse author, Instant createdAt, Instant updatedAt,
                                  boolean canEdit, boolean canDelete) {}
}
