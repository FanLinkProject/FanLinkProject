package org.example.backend.replay.dto;

import org.example.backend.replay.entity.ReplayAccessType;

public record ReplayUpdateRequest(
        String title,
        ReplayAccessType accessType
) {}
