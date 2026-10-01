CREATE TABLE invitations (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    email VARCHAR(254) NOT NULL,
    role VARCHAR(10) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    invited_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID,
    CONSTRAINT fk_invitations_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE,
    CONSTRAINT fk_invitations_invited_by FOREIGN KEY (invited_by) REFERENCES users (id),
    CONSTRAINT fk_invitations_accepted_by FOREIGN KEY (accepted_by) REFERENCES users (id),
    CONSTRAINT uq_invitations_token_hash UNIQUE (token_hash),
    CONSTRAINT ck_invitations_role CHECK (role IN ('ADMIN', 'MEMBER')),
    CONSTRAINT ck_invitations_email_normalized CHECK (email = LOWER(TRIM(email))),
    CONSTRAINT ck_invitations_expiry CHECK (expires_at > created_at)
);

CREATE INDEX ix_invitations_organization_email ON invitations (organization_id, email);
