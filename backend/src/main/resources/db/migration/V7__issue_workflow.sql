-- Workflow fields: status, priority, optional assignee and a modification timestamp.
ALTER TABLE issues ADD COLUMN status VARCHAR(12) NOT NULL DEFAULT 'TODO';
ALTER TABLE issues ADD COLUMN priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE issues ADD COLUMN assignee_id UUID;
ALTER TABLE issues ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
UPDATE issues SET updated_at = created_at;
ALTER TABLE issues ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE issues ADD CONSTRAINT fk_issues_assignee FOREIGN KEY (assignee_id) REFERENCES users (id);
ALTER TABLE issues ADD CONSTRAINT ck_issues_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE'));
ALTER TABLE issues ADD CONSTRAINT ck_issues_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'));

CREATE INDEX ix_issues_project_status ON issues (project_id, status);
CREATE INDEX ix_issues_assignee ON issues (assignee_id);
