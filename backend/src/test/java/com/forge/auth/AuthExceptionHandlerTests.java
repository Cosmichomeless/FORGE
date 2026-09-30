package com.forge.auth;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import static org.assertj.core.api.Assertions.assertThat;

class AuthExceptionHandlerTests {
    @Test void unrelatedConstraintIsNotDuplicateEmail() {
        var response = new AuthExceptionHandler().duplicate(new DataIntegrityViolationException("internal detail"));
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().message()).isEqualTo("Unable to complete request");
        assertThat(response.getBody().fieldErrors()).isEmpty();
    }
}
