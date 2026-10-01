CREATE TABLE issue_activity (
    id UUID PRIMARY KEY,
    seq BIGINT GENERATED ALWAYS AS IDENTITY,
    issue_id UUID NOT NULL,
    actor_id UUID NOT NULL,
    type VARCHAR(20) NOT NULL,
    old_value VARCHAR(100),
    new_value VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_activity_issue FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_actor FOREIGN KEY (actor_id) REFERENCES users (id)
);
CREATE INDEX ix_activity_issue_seq ON issue_activity (issue_id, seq);
