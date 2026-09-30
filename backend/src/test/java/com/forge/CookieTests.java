package com.forge;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.net.URI;
import java.net.http.*;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:cookies;MODE=PostgreSQL;NON_KEYWORDS=KEY,VALUE",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "server.servlet.session.cookie.secure=true", "server.servlet.session.cookie.same-site=none"
})
class CookieTests {
    @LocalServerPort int port;
    private final HttpClient client = HttpClient.newHttpClient();
    private URI uri(String path) { return URI.create("http://localhost:" + port + "/api/v1/auth/" + path); }
    @Test void realLoginIssuesConfiguredCookieAndInvalidatesOldId() throws Exception {
        var csrf = client.send(HttpRequest.newBuilder(uri("csrf")).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(csrf.statusCode()).isEqualTo(200);
        String cookie = csrf.headers().firstValue("set-cookie").orElseThrow().split(";", 2)[0];
        var token = new ObjectMapper().readTree(csrf.body());
        String email = UUID.randomUUID() + "@example.com";
        String input = new ObjectMapper().writeValueAsString(java.util.Map.of("name", "Cookie", "email", email, "password", "password123"));
        var register = client.send(HttpRequest.newBuilder(uri("register")).header("Cookie", cookie)
                .header("Content-Type", "application/json").header(token.get("headerName").asText(), token.get("token").asText())
                .POST(HttpRequest.BodyPublishers.ofString(input)).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(register.statusCode()).isEqualTo(201);
        var login = client.send(HttpRequest.newBuilder(uri("login")).header("Cookie", cookie)
                .header("Content-Type", "application/json").header(token.get("headerName").asText(), token.get("token").asText())
                .POST(HttpRequest.BodyPublishers.ofString(input)).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        String issued = login.headers().firstValue("set-cookie").orElseThrow();
        assertThat(issued).contains("HttpOnly", "Secure", "SameSite=None");
        assertThat(issued.split(";", 2)[0]).isNotEqualTo(cookie);
        var oldSession = client.send(HttpRequest.newBuilder(uri("me")).header("Cookie", cookie).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(oldSession.statusCode()).isEqualTo(401);
        var currentSession = client.send(HttpRequest.newBuilder(uri("me")).header("Cookie", issued.split(";", 2)[0]).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(currentSession.statusCode()).isEqualTo(200);
    }
}
