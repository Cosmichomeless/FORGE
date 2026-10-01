package com.forge.auth;

import org.springframework.context.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.context.*;
import org.springframework.security.web.authentication.session.*;
import org.springframework.web.cors.*;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean CsrfTokenRepository csrfTokenRepository() { return new HttpSessionCsrfTokenRepository(); }
    @Bean SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    @Bean SessionAuthenticationStrategy sessionAuthenticationStrategy(CsrfTokenRepository csrf) {
        return new CompositeSessionAuthenticationStrategy(List.of(new ChangeSessionIdAuthenticationStrategy(), new CsrfAuthenticationStrategy(csrf)));
    }
    @Bean CorsConfigurationSource cors(@Value("${app.frontend-origin}") String origin) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(origin));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "X-CSRF-TOKEN"));
        config.setAllowCredentials(true);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
    @Bean SecurityFilterChain security(HttpSecurity http, CsrfTokenRepository csrf, SecurityContextRepository contexts, CorsConfigurationSource cors) throws Exception {
        return http.cors(c -> c.configurationSource(cors))
                .csrf(c -> c.csrfTokenRepository(csrf))
                .securityContext(c -> c.securityContextRepository(contexts))
                .authorizeHttpRequests(a -> a.requestMatchers("/actuator/health", "/api/v1/auth/csrf", "/api/v1/auth/register", "/api/v1/auth/login").permitAll().anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> jsonError(res, 401, "Authentication required"))
                        .accessDeniedHandler((req, res, ex) -> jsonError(res, 403, "Invalid or missing CSRF token, or access denied")))
                .logout(l -> l.logoutUrl("/api/v1/auth/logout").deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((req, res, auth) -> res.setStatus(204)))
                .build();
    }
    private static void jsonError(HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status); response.setContentType("application/json"); response.setHeader("Cache-Control", "no-store");
        response.getWriter().write(new ObjectMapper().writeValueAsString(Map.of("message", message, "fieldErrors", Map.of())));
    }
}
