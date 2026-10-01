package com.forge.auth;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    private final UserRepository users;
    public CurrentUser(UserRepository users) { this.users = users; }
    public User require(Authentication authentication) {
        return users.findByEmail(authentication.getName()).orElseThrow(() -> new BadCredentialsException("Invalid session"));
    }
}
