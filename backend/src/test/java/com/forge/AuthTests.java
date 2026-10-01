package com.forge;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "spring.datasource.url=${AUTH_TEST_DB_URL:jdbc:h2:mem:auth;MODE=PostgreSQL;NON_KEYWORDS=KEY,VALUE}",
        "spring.datasource.username=${AUTH_TEST_DB_USER:sa}",
        "spring.datasource.password=${AUTH_TEST_DB_PASSWORD:}"
})
@AutoConfigureMockMvc
class AuthTests {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();
    private MockHttpSession session;
    private String token;
    private String header;

    @BeforeEach void setup() throws Exception {
        for (String table : java.util.List.of("invitations", "memberships", "organizations", "users")) {
            if (jdbc.queryForObject("select count(*) from information_schema.tables where lower(table_schema) = 'public' and lower(table_name) = ?", Integer.class, table) > 0) {
                jdbc.update("delete from " + table);
            }
        }
        csrf(null);
    }

    private void csrf(MockHttpSession existing) throws Exception {
        var request = get("/api/v1/auth/csrf");
        if (existing != null) request.session(existing);
        MvcResult result = mvc.perform(request).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store"))).andReturn();
        session = (MockHttpSession) result.getRequest().getSession();
        JsonNode json = mapper.readTree(result.getResponse().getContentAsString());
        token = json.get("token").asText();
        header = json.get("headerName").asText();
    }
    private MockHttpServletRequestBuilder postJson(String path, String json) {
        return post("/api/v1/auth/" + path).session(session).header(header, token)
                .contentType("application/json").content(json);
    }
    private void register() throws Exception {
        mvc.perform(postJson("register", "{\"name\":\"Alice\",\"email\":\" Alice@Example.com \",\"password\":\"password123\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.id").exists()).andExpect(jsonPath("$.name").value("Alice"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }
    @Test void registersNormalizedUserAndHashesPassword() throws Exception {
        register();
        String hash = jdbc.queryForObject("select password_hash from users", String.class);
        assertThat(hash).startsWith("$2").hasSize(60).isNotEqualTo("password123");
    }
    @Test void duplicateEmailReturnsConflict() throws Exception {
        register();
        mvc.perform(postJson("register", "{\"name\":\"Bob\",\"email\":\"ALICE@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.fieldErrors.email").exists());
    }
    @Test void invalidRegistrationHasFieldErrors() throws Exception {
        mvc.perform(postJson("register", "{\"name\":\"\",\"email\":\"bad\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.fieldErrors.name").exists()).andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }
    @Test void rejectsPasswordsOver72Utf8Bytes() throws Exception {
        mvc.perform(postJson("register", mapper.writeValueAsString(java.util.Map.of("name","Alice","email","a@example.com","password","é".repeat(37)))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.password").exists());
    }
    @Test void rejectsOversizeNameAndEmail() throws Exception {
        mvc.perform(postJson("register", mapper.writeValueAsString(java.util.Map.of("name","a".repeat(101),"email","a".repeat(250)+"@x.com","password","password123"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.name").exists()).andExpect(jsonPath("$.fieldErrors.email").exists());
    }
    @Test void anonymousMeIsUnauthorized() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").exists());
    }
    @Test void loginPersistsSessionRotatesIdAndRenewsCsrfThenLogout() throws Exception {
        register();
        String oldId = session.getId();
        String oldToken = token;
        mvc.perform(postJson("login", "{\"email\":\" ALICE@example.com \",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("alice@example.com"));
        assertThat(session.getId()).isNotEqualTo(oldId);
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Alice"));
        mvc.perform(postJson("logout", "{}")).andExpect(status().isForbidden());
        csrf(session);
        assertThat(token).isNotEqualTo(oldToken);
        mvc.perform(postJson("logout", "{}")).andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("JSESSIONID=")));
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }
    @Test void invalidLoginIsUnauthorized() throws Exception {
        register();
        mvc.perform(postJson("login", "{\"email\":\"alice@example.com\",\"password\":\"incorrect\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Invalid email or password"));
        mvc.perform(postJson("login", "{\"email\":\"unknown@example.com\",\"password\":\"incorrect\"}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void failedLoginLeavesSessionAnonymous() throws Exception {
        register();
        mvc.perform(postJson("login", mapper.writeValueAsString(java.util.Map.of("email", "alice@example.com", "password", "wrong"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").session(session)).andExpect(status().isUnauthorized());
    }
    @Test void allUnsafeEndpointsRequireCsrf() throws Exception {
        for (String endpoint : java.util.List.of("register", "login", "logout", "other")) {
            mvc.perform(post("/api/v1/auth/" + endpoint).contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.message").exists());
        }
    }
    @Test void corsAllowsOnlyConfiguredOriginWithCredentials() throws Exception {
        mvc.perform(options("/api/v1/auth/login").header("Origin", "http://localhost:3000")
                .header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "content-type,x-csrf-token"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        mvc.perform(options("/api/v1/auth/login").header("Origin", "http://evil.example").header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden()).andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
    @Test void malformedJsonReturnsSafeError() throws Exception {
        mvc.perform(postJson("register", "{bad")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").exists());
    }
}
