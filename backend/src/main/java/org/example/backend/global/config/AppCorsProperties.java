package org.example.backend.global.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * CORS 허용 origin 패턴 (application.yml에서 설정, IP 변경 시 yml만 수정).
 * dev/prod 분리 시 application-dev.yml, application-prod.yml에서 오버라이드 가능.
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.cors")
public class AppCorsProperties {

    /**
     * 허용 Origin 패턴 (예: http://localhost:3000, http://192.168.0.19:3000, https://*.vercel.app)
     */
    private List<String> allowedOriginPatterns = List.of(
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://192.168.0.19:3000",
            "https://fan-link-project.vercel.app",
            "https://fanlink.site",
            "https://*.vercel.app"
    );
}