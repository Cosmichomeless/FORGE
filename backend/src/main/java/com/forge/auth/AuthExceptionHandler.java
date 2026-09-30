package com.forge.auth;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import java.util.LinkedHashMap;
import java.util.Map;
import static com.forge.auth.AuthDtos.*;

@RestControllerAdvice
public class AuthExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ApiError("Invalid input", fields));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> malformed() { return ResponseEntity.badRequest().body(new ApiError("Invalid JSON", Map.of())); }
    @ExceptionHandler(AuthService.InvalidPasswordException.class)
    ResponseEntity<ApiError> password() { return ResponseEntity.badRequest().body(new ApiError("Invalid input", Map.of("password", "Password must not exceed 72 UTF-8 bytes"))); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> duplicate(DataIntegrityViolationException ex) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof org.hibernate.exception.ConstraintViolationException constraint
                    && constraint.getConstraintName() != null
                    && constraint.getConstraintName().toLowerCase(java.util.Locale.ROOT).contains("uq_users_email")) {
                return ResponseEntity.status(409).body(new ApiError("Email already registered", Map.of("email", "Email already registered")));
            }
        }
        return ResponseEntity.internalServerError().body(new ApiError("Unable to complete request", Map.of()));
    }
    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<ApiError> credentials(BadCredentialsException ex) { return ResponseEntity.status(401).body(new ApiError(ex.getMessage(), Map.of())); }
}
