package com.forge.auth;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id private UUID id;
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false, unique = true, length = 254) private String email;
    @JsonIgnore
    @Column(name = "password_hash", nullable = false, length = 100) private String passwordHash;
    protected User() {}
    public User(String name, String email, String passwordHash) {
        this.id = UUID.randomUUID(); this.name = name; this.email = email; this.passwordHash = passwordHash;
    }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    @JsonIgnore public String getPasswordHash() { return passwordHash; }
}
