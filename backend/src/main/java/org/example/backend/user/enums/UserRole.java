package org.example.backend.user.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum UserRole {
    USER("ROLE_USER"),
    ADMIN("ROLE_ADMIN"),
    ARTIST("ROLE_ARTIST"),
    GROUP("ROLE_GROUP");

    private final String value;
}