-- Per-project counter behind identifiers such as FORGE-1. It is only advanced while the project row is locked.
ALTER TABLE projects ADD COLUMN last_issue_number BIGINT NOT NULL DEFAULT 0;

CREATE TABLE issues (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL,
    issue_number BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(5000),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_issues_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    CONSTRAINT fk_issues_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT uq_issues_project_number UNIQUE (project_id, issue_number),
    CONSTRAINT ck_issues_number_positive CHECK (issue_number > 0)
);
