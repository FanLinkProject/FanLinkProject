package org.example.backend.global.config;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;

/**
 * GET /favicon.ico 요청 시 static/favicon.png 를 반환한다.
 * favicon.png 를 src/main/resources/static/ 에 두면 된다.
 */
@RestController
public class FaviconController {

    @GetMapping("/favicon.ico")
    public ResponseEntity<byte[]> favicon() throws IOException {
        ClassPathResource resource = new ClassPathResource("static/favicon.png");
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        byte[] bytes;
        try (InputStream in = resource.getInputStream()) {
            bytes = in.readAllBytes();
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setCacheControl("public, max-age=86400");
        return ResponseEntity.ok().headers(headers).body(bytes);
    }
}
