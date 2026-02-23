package org.example.backend.delivery.controller;

import org.example.backend.delivery.dto.DeliveryResponseDto;
import org.example.backend.delivery.dto.DeliveryStatusHistoryResponseDto;
import org.example.backend.delivery.service.DeliveryService;
import org.example.backend.delivery.security.AfterShipWebhookSignatureVerifier;
import org.example.backend.global.exception.GlobalExceptionHandler;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.user.entity.User;
import org.example.backend.user.enums.UserRole;
import org.example.backend.user.enums.UserStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {DeliveryController.class, DeliveryWebhookController.class})
@Import({DeliveryControllerIntegrationTest.TestSecurityConfig.class, GlobalExceptionHandler.class})
class DeliveryControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DeliveryService deliveryService;

    @MockBean
    private AfterShipWebhookSignatureVerifier signatureVerifier;

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    @DisplayName("GET /api/deliveries/{id}는 비인증 사용자에게 401을 반환한다")
    void getDelivery_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/deliveries/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/deliveries/{id}는 본인 principal로 조회 서비스가 호출된다")
    void getDelivery_callsServiceWithPrincipalUserId() throws Exception {
        DeliveryResponseDto response = new DeliveryResponseDto(
                1L, "홍길동", "서울시", "101동", "04", "12345", "배송 중", "InTransit");
        when(deliveryService.trackDeliveryForUser(1L, 10L)).thenReturn(response);

        mockMvc.perform(get("/api/deliveries/1")
                        .with(authentication(authenticationFor(10L, UserRole.USER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveryId").value(1L))
                .andExpect(jsonPath("$.status").value("배송 중"));

        verify(deliveryService).trackDeliveryForUser(1L, 10L);
    }

    @Test
    @DisplayName("POST /api/deliveries/{id}/start는 USER 권한이면 403이다")
    void startShipping_forbiddenForUserRole() throws Exception {
        mockMvc.perform(post("/api/deliveries/1/start")
                        .param("courier", "04")
                        .param("number", "123456")
                        .with(authentication(authenticationFor(10L, UserRole.USER))))
                .andExpect(status().isForbidden());

        verify(deliveryService, never()).startShipping(eq(1L), anyString(), anyString(), anyLong(), any(UserRole.class));
    }

    @Test
    @DisplayName("POST /api/deliveries/{id}/start는 ADMIN 권한이면 200이다")
    void startShipping_allowedForAdminRole() throws Exception {
        DeliveryResponseDto response = new DeliveryResponseDto(
                1L, "홍길동", "서울시", "101동", "04", "123456", "배송 중", "Ready");
        when(deliveryService.startShipping(1L, "04", "123456", 1L, UserRole.ADMIN)).thenReturn(response);

        mockMvc.perform(post("/api/deliveries/1/start")
                        .param("courier", "04")
                        .param("number", "123456")
                        .with(authentication(authenticationFor(1L, UserRole.ADMIN))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.trackingNumber").value("123456"));

        verify(deliveryService).startShipping(1L, "04", "123456", 1L, UserRole.ADMIN);
    }

    @Test
    @DisplayName("GET /api/deliveries/{id}/history는 인증 사용자에게 이력 목록을 반환한다")
    void getHistory_returnsHistoryForAuthenticatedUser() throws Exception {
        DeliveryStatusHistoryResponseDto history = new DeliveryStatusHistoryResponseDto(
                "READY", "SHIPPING", "START_SHIPPING", Instant.parse("2026-01-01T00:00:00Z"));
        when(deliveryService.getStatusHistoryForUser(1L, 10L)).thenReturn(List.of(history));

        mockMvc.perform(get("/api/deliveries/1/history")
                        .with(authentication(authenticationFor(10L, UserRole.USER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fromStatus").value("READY"))
                .andExpect(jsonPath("$[0].toStatus").value("SHIPPING"));

        verify(deliveryService).getStatusHistoryForUser(1L, 10L);
    }

    @Test
    @DisplayName("POST /api/deliveries/webhook/aftership는 permitAll이며 서명 검증 실패 시 INVALID_WEBHOOK_SIGNATURE를 반환한다")
    void webhook_permitAll_andSignatureValidation() throws Exception {
        when(signatureVerifier.signatureHeader()).thenReturn("as-signature-hmac-sha256");
        when(signatureVerifier.verify(anyString(), anyString())).thenReturn(false);

        mockMvc.perform(post("/api/deliveries/webhook/aftership")
                        .header("as-signature-hmac-sha256", "bad-signature")
                        .contentType("application/json")
                        .content("{\"trackingNumber\":\"123\",\"courierCode\":\"dhl\",\"tag\":\"InTransit\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_WEBHOOK_SIGNATURE"));

        verify(deliveryService, never()).handleAfterShipWebhook(anyString(), anyString(), anyString());
    }

    private Authentication authenticationFor(Long userId, UserRole role) {
        User user = User.builder()
                .id(userId)
                .email("user" + userId + "@test.com")
                .name("테스트")
                .nickname("tester")
                .role(role)
                .status(UserStatus.ACTIVE)
                .privacyPolicyAgreed(true)
                .build();
        PrincipalDetails principalDetails = new PrincipalDetails(user);
        return new UsernamePasswordAuthenticationToken(
                principalDetails, null, principalDetails.getAuthorities());
    }

    @TestConfiguration
    @EnableMethodSecurity
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                    .csrf(csrf -> csrf.disable())
                    .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                    .authorizeHttpRequests(auth -> auth
                            .requestMatchers("/api/deliveries/webhook/**").permitAll()
                            .requestMatchers(HttpMethod.POST, "/api/deliveries/*/start")
                            .hasAnyRole("ADMIN", "ARTIST", "GROUP")
                            .requestMatchers(HttpMethod.GET, "/api/deliveries/*").authenticated()
                            .requestMatchers(HttpMethod.GET, "/api/deliveries/*/history").authenticated()
                            .anyRequest().permitAll())
                    .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
            return http.build();
        }
    }
}
