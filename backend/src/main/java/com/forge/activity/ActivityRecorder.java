package com.forge.activity;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** MANDATORY propagation: an entry can only be written inside the transaction of the change it describes, never on its own. */
@Component
public class ActivityRecorder {
    private final ActivityRepository activity;
    public ActivityRecorder(ActivityRepository activity) { this.activity = activity; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID issueId, UUID actorId, ActivityType type, Object oldValue, Object newValue, Instant now) {
        activity.save(new Activity(issueId, actorId, type, oldValue == null ? null : oldValue.toString(), newValue == null ? null : newValue.toString(), now));
    }

    /** Records only when the value actually changed, so repeated identical requests leave no noise. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordChange(UUID issueId, UUID actorId, ActivityType type, Object oldValue, Object newValue, Instant now) {
        if (!Objects.equals(oldValue, newValue)) record(issueId, actorId, type, oldValue, newValue, now);
    }
}
