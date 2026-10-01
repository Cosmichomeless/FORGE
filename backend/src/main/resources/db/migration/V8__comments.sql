CREATE TABLE comments (
    id UUID PRIMARY KEY,
    issue_id UUID NOT NULL,
    author_id UUID NOT NULL,
    body VARCHAR(5000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_comments_issue FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id)
);
CREATE INDEX ix_comments_issue_created ON comments (issue_id, created_at);
