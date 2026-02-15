package org.example.backend.global.util;

import org.example.backend.global.security.details.PrincipalDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityContextUtil {

    // SecurityContext에서 PrincipalDetails를 반환한다(없으면 null).
    public PrincipalDetails getPrincipalDetails() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return null;
        }
        if (authentication.getPrincipal() instanceof PrincipalDetails principalDetails) {
            return principalDetails;
        }
        return null;
    }
}
