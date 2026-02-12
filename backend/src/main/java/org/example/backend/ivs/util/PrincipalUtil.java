package org.example.backend.ivs.util;

import jakarta.servlet.http.HttpServletRequest;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.ivs.exception.IvsErrorCode;
import org.example.backend.ivs.exception.IvsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class PrincipalUtil {

    // SecurityContext에서 userId를 추출한다.
    public Long resolveUserId(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof PrincipalDetails principalDetails) {
            return principalDetails.getUserId();
        }
        throw new IvsException(IvsErrorCode.FORBIDDEN_OPERATION, "로그인이 필요합니다.");
    }
}
