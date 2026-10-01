package com.forge.common;

import java.util.Map;

public class ApiException extends RuntimeException {
    private final int status;
    private final Map<String, String> fieldErrors;

    public ApiException(int status, String message) { this(status, message, Map.of()); }
    public ApiException(int status, String message, Map<String, String> fieldErrors) {
        super(message); this.status = status; this.fieldErrors = fieldErrors;
    }
    public int status() { return status; }
    public Map<String, String> fieldErrors() { return fieldErrors; }

    public static ApiException notFound(String message) { return new ApiException(404, message); }
    public static ApiException forbidden(String message) { return new ApiException(403, message); }
    public static ApiException conflict(String message) { return new ApiException(409, message); }
    public static ApiException conflict(String message, String field) { return new ApiException(409, message, Map.of(field, message)); }
}
