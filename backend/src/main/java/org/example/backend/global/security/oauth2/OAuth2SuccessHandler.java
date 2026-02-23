package org.example.backend.global.security.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final OAuthAuthorizationCodeStore oauthAuthorizationCodeStore;

    @Value("${oauth2.redirect-uri:http://localhost:3000/oauth2/login/success}")
    private String redirectUri;

    private static final String DEFAULT_FRONT_REDIRECT = "http://localhost:3000/oauth2/login/success";

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        try {
            PrincipalDetails principalDetails = (PrincipalDetails) authentication.getPrincipal();
            User user = principalDetails.getUser();

            String code = oauthAuthorizationCodeStore.createCode(user.getEmail(), user.getRole().getValue());

            String resolvedRedirectUri = redirectUri;
            if (resolvedRedirectUri == null || resolvedRedirectUri.isBlank() || resolvedRedirectUri.contains("callback.html")) {
                resolvedRedirectUri = DEFAULT_FRONT_REDIRECT;
            }

            String targetUrl = UriComponentsBuilder.fromUriString(resolvedRedirectUri)
                    .queryParam("code", code)
                    .build()
                    .encode()
                    .toUriString();

            log.info("OAuth2 redirect prepared: email={}, redirectUri={}", user.getEmail(), resolvedRedirectUri);
            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        } catch (Exception e) {
            log.error("OAuth2 login success handling failed", e);
            response.sendRedirect("http://localhost:3000?error=oauth2_failed");
        }
    }
}
