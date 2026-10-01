package com.forge.issue;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Shared text-search predicate: an exact issue key such as FORGE-12 or a case-insensitive title substring. */
final class IssueSearch {
    private IssueSearch() {}
    private static final Pattern KEY = Pattern.compile("^([A-Za-z][A-Za-z0-9]*)-(\\d{1,18})$");

    static String clean(String q) { return q == null ? null : q.trim().isEmpty() ? null : q.trim(); }
    /** Project key part of a key-shaped query, upper-cased; null when the query is not key-shaped. */
    static String keyOf(String q) {
        Matcher m = q == null ? null : KEY.matcher(q.trim());
        return m != null && m.matches() ? m.group(1).toUpperCase(Locale.ROOT) : null;
    }
    static Long numberOf(String q) {
        Matcher m = q == null ? null : KEY.matcher(q.trim());
        return m != null && m.matches() ? Long.parseLong(m.group(2)) : null;
    }
    /** @param keyProjectId the project whose key the query names, if any; combined with the number it forms an exact match */
    static Predicate match(String q, UUID keyProjectId, Long number, Root<Issue> root, CriteriaBuilder cb) {
        String text = clean(q);
        if (text == null) return null;
        String escaped = text.toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
        Predicate title = cb.like(cb.lower(root.get("title")), "%" + escaped + "%", '\\');
        if (keyProjectId == null || number == null) return title;
        return cb.or(title, cb.and(cb.equal(root.get("projectId"), keyProjectId), cb.equal(root.get("number"), number)));
    }
}
