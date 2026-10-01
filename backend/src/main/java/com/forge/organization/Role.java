package com.forge.organization;

public enum Role {
    OWNER, ADMIN, MEMBER;

    public boolean canManageOrganization() { return this == OWNER || this == ADMIN; }
}
