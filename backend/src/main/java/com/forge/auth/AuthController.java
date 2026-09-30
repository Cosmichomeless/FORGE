package com.forge.auth;

import jakarta.validation.Valid;
import jakarta.servlet.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import java.util.List;
import static com.forge.auth.AuthDtos.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    private final SecurityContextRepository contexts;
    private final SessionAuthenticationStrategy sessions;
    public AuthController(AuthService service, SecurityContextRepository contexts, SessionAuthenticationStrategy sessions) {
        this.service = service; this.contexts = contexts; this.sessions = sessions;
    }
    @GetMapping("/csrf")
    CsrfResponse csrf(CsrfToken token) { return new CsrfResponse(token.getToken(), token.getHeaderName()); }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    UserResponse register(@Valid @RequestBody RegisterRequest input) { return service.register(input); }
    @PostMapping("/login")
    UserResponse login(@Valid @RequestBody LoginRequest input, HttpServletRequest request, HttpServletResponse response) {
        UserResponse user = service.login(input);
        var authentication = UsernamePasswordAuthenticationToken.authenticated(user.email(), null, List.of(new SimpleGrantedAuthority("ROLE_USER")));
        sessions.onAuthentication(authentication, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        return user;
    }
    @GetMapping("/me")
    UserResponse me(Authentication authentication) { return service.current(authentication.getName()); }
}
