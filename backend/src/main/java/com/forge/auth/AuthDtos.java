package com.forge.auth;

import jakarta.validation.constraints.*;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}
    static String normalize(String email) { return email == null ? null : email.trim().toLowerCase(Locale.ROOT); }
    public record RegisterRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72) String password) {
        public RegisterRequest { name = name == null ? null : name.trim(); email = normalize(email); }
    }
    public record LoginRequest(@NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 72) String password) {
        public LoginRequest { email = normalize(email); }
    }
    public record UserResponse(UUID id, String name, String email) {
        static UserResponse from(User user) { return new UserResponse(user.getId(), user.getName(), user.getEmail()); }
    }
    public record ApiError(String message, Map<String, String> fieldErrors) {}
    public record CsrfResponse(String token, String headerName) {}
}
