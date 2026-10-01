package com.forge.comment;

import com.forge.auth.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import static com.forge.comment.CommentDtos.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/projects/{projectId}/issues/{number}/comments")
public class CommentController {
    private final CommentService service;
    private final CurrentUser currentUser;
    public CommentController(CommentService service, CurrentUser currentUser) { this.service = service; this.currentUser = currentUser; }

    @GetMapping
    List<CommentResponse> list(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number, Authentication auth) {
        return service.list(organizationId, projectId, number, currentUser.require(auth));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    CommentResponse add(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number,
                        @Valid @RequestBody CommentRequest input, Authentication auth) {
        return service.add(organizationId, projectId, number, currentUser.require(auth), input);
    }
    @PutMapping("/{commentId}")
    CommentResponse edit(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number, @PathVariable UUID commentId,
                         @Valid @RequestBody CommentRequest input, Authentication auth) {
        return service.edit(organizationId, projectId, number, commentId, currentUser.require(auth), input);
    }
    @DeleteMapping("/{commentId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable UUID organizationId, @PathVariable UUID projectId, @PathVariable long number, @PathVariable UUID commentId, Authentication auth) {
        service.delete(organizationId, projectId, number, commentId, currentUser.require(auth));
    }
}
