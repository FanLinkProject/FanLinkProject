package org.example.backend.order.controller;

import org.example.backend.global.exception.GlobalExceptionHandler;
import org.example.backend.global.security.details.PrincipalDetails;
import org.example.backend.order.dto.response.ArtistOrderDeliveryResponseDto;
import org.example.backend.order.service.OrderService;
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
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = OrderController.class)
@Import({OrderControllerIntegrationTest.TestSecurityConfig.class, GlobalExceptionHandler.class})
class OrderControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    @DisplayName("GET /api/orders/artist-console는 비인증 사용자에게 401을 반환한다")
    void getArtistConsoleOrders_requiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/orders/artist-console"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/orders/artist-console는 USER 권한이면 403을 반환한다")
    void getArtistConsoleOrders_forbiddenForUserRole() throws Exception {
        mockMvc.perform(get("/api/orders/artist-console")
                        .with(authentication(authenticationFor(10L, UserRole.USER))))
                .andExpect(status().isForbidden());

        verify(orderService, never()).getArtistConsoleOrders(anyLong(), any(UserRole.class));
    }

    @Test
    @DisplayName("GET /api/orders/artist-console는 ARTIST 권한이면 배송 관리 목록을 반환한다")
    void getArtistConsoleOrders_returnsDataForArtistRole() throws Exception {
        ArtistOrderDeliveryResponseDto item = new ArtistOrderDeliveryResponseDto(
                1L,
                "ORD-12345",
                "Signature Hoodie - Violet",
                new BigDecimal("68000"),
                "COMPLETED",
                Instant.parse("2026-01-01T00:00:00Z"),
                77L,
                "READY",
                null,
                null
        );
        when(orderService.getArtistConsoleOrders(10L, UserRole.ARTIST)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/orders/artist-console")
                        .with(authentication(authenticationFor(10L, UserRole.ARTIST))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].orderNo").value("ORD-12345"))
                .andExpect(jsonPath("$[0].deliveryStatus").value("READY"));

        verify(orderService).getArtistConsoleOrders(10L, UserRole.ARTIST);
    }

    private Authentication authenticationFor(Long userId, UserRole role) {
        User user = User.builder()
                .id(userId)
                .email("user" + userId + "@test.com")
                .name("테스터")
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
                            .requestMatchers(HttpMethod.GET, "/api/orders/artist-console")
                            .hasAnyRole("ADMIN", "ARTIST", "GROUP")
                            .requestMatchers("/api/orders/**").authenticated()
                            .anyRequest().permitAll())
                    .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
            return http.build();
        }
    }
}
