package com.forge.auth;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import static com.forge.auth.AuthDtos.*;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String dummyHash;
    public AuthService(UserRepository users, PasswordEncoder encoder) {
        this.users = users; this.encoder = encoder;
        this.dummyHash = encoder.encode(java.util.UUID.randomUUID().toString());
    }
    @Transactional
    public UserResponse register(RegisterRequest input) {
        if (input.password().getBytes(StandardCharsets.UTF_8).length > 72) throw new InvalidPasswordException();
        return UserResponse.from(users.saveAndFlush(new User(input.name(), input.email(), encoder.encode(input.password()))));
    }
    public UserResponse login(LoginRequest input) {
        if (input.password().getBytes(StandardCharsets.UTF_8).length > 72) throw new BadCredentialsException("Invalid email or password");
        User user = users.findByEmail(input.email()).orElse(null);
        boolean valid = encoder.matches(input.password(), user == null ? dummyHash : user.getPasswordHash());
        if (user == null || !valid) throw new BadCredentialsException("Invalid email or password");
        return UserResponse.from(user);
    }
    public UserResponse current(String email) {
        return users.findByEmail(email).map(UserResponse::from).orElseThrow(() -> new BadCredentialsException("Invalid session"));
    }
    public static class InvalidPasswordException extends RuntimeException {}
}
