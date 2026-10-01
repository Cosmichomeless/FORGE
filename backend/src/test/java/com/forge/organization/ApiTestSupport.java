package com.forge.organization;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Shared MockMvc scaffolding: real sessions and CSRF tokens, one isolated in-memory database. */
@SpringBootTest(properties = {
        "spring.datasource.url=${AUTH_TEST_DB_URL:jdbc:h2:mem:organizations;MODE=PostgreSQL;NON_KEYWORDS=KEY,VALUE}",
        "spring.datasource.username=${AUTH_TEST_DB_USER:sa}", "spring.datasource.password=${AUTH_TEST_DB_PASSWORD:}"
})
@AutoConfigureMockMvc
public abstract class ApiTestSupport {
    @Autowired protected MockMvc mvc;
    @Autowired protected JdbcTemplate jdbc;
    protected final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach void cleanDatabase() {
        jdbc.update("delete from issues");
        jdbc.update("delete from projects");
        jdbc.update("delete from invitations");
        jdbc.update("delete from memberships");
        jdbc.update("delete from organizations");
        jdbc.update("delete from users");
    }

    /** A signed-in browser: session cookie plus the CSRF token it must echo on unsafe requests. */
    public final class Client {
        public final String email;
        private final MockHttpSession session = new MockHttpSession();
        private String token;
        private String header;

        private Client(String email) { this.email = email; }

        private void refreshCsrf() throws Exception {
            JsonNode csrf = mapper.readTree(mvc.perform(MockMvcRequestBuilders.get("/api/v1/auth/csrf").session(session))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
            token = csrf.get("token").asText(); header = csrf.get("headerName").asText();
        }
        private MockHttpServletRequestBuilder withBody(MockHttpServletRequestBuilder request, Object body) {
            request.session(session).header(header, token);
            return body == null ? request : request.contentType("application/json").content(mapper.writeValueAsString(body));
        }
        public ResultActions get(String path) throws Exception { return mvc.perform(MockMvcRequestBuilders.get(path).session(session)); }
        public ResultActions post(String path, Object body) throws Exception { return mvc.perform(withBody(MockMvcRequestBuilders.post(path), body)); }
        public ResultActions put(String path, Object body) throws Exception { return mvc.perform(withBody(MockMvcRequestBuilders.put(path), body)); }
        public ResultActions delete(String path) throws Exception { return mvc.perform(withBody(MockMvcRequestBuilders.delete(path), null)); }
        public JsonNode json(ResultActions result) throws Exception { return mapper.readTree(result.andReturn().getResponse().getContentAsString()); }
        public String createOrganization(String name, String slug) throws Exception {
            return json(post("/api/v1/organizations", Map.of("name", name, "slug", slug)).andExpect(status().isCreated())).get("id").asText();
        }
    }

    protected Client signUp(String name, String email) throws Exception {
        Client client = new Client(email);
        client.refreshCsrf();
        Map<String, String> credentials = Map.of("email", email, "password", "password123");
        mvc.perform(withCsrf(MockMvcRequestBuilders.post("/api/v1/auth/register"), client, Map.of("name", name, "email", email, "password", "password123")))
                .andExpect(status().isCreated());
        mvc.perform(withCsrf(MockMvcRequestBuilders.post("/api/v1/auth/login"), client, credentials)).andExpect(status().isOk());
        client.refreshCsrf();
        return client;
    }
    private MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder request, Client client, Object body) {
        return client.withBody(request, body);
    }

    protected String userId(String email) { return jdbc.queryForObject("select id from users where email = ?", String.class, email); }

    /** Adds a membership directly, bypassing the invitation flow, to set up role scenarios quickly. */
    protected void addMember(String organizationId, String email, String role) {
        jdbc.update("insert into memberships (id, organization_id, user_id, role, created_at) select ?::uuid, ?::uuid, id, ?, current_timestamp from users where email = ?",
                java.util.UUID.randomUUID().toString(), organizationId, role, email);
    }
}
