package org.example.backend.delivery.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Slf4j
@Component
public class AfterShipWebhookSignatureVerifier {

    @Value("${delivery.webhook.signature-enabled:true}")
    private boolean signatureEnabled;

    @Value("${delivery.webhook.signature-header:as-signature-hmac-sha256}")
    private String signatureHeader;

    @Value("${delivery.webhook.aftership-secret:}")
    private String webhookSecret;

    public String signatureHeader() {
        return signatureHeader;
    }

    public boolean verify(String rawBody, String signature) {
        if (!signatureEnabled) {
            return true;
        }
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("AfterShip webhook signature verification is enabled but secret is empty.");
            return false;
        }
        if (rawBody == null || signature == null || signature.isBlank()) {
            return false;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);

            byte[] digest = mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8));
            String expectedBase64 = Base64.getEncoder().encodeToString(digest);
            String expectedHex = bytesToHex(digest);
            String actual = normalizeSignature(signature);

            return constantTimeEquals(expectedBase64, actual) || constantTimeEquals(expectedHex, actual);
        } catch (Exception e) {
            log.error("Failed to verify AfterShip webhook signature", e);
            return false;
        }
    }

    private String normalizeSignature(String signature) {
        String trimmed = signature.trim();
        if (trimmed.startsWith("sha256=")) {
            return trimmed.substring("sha256=".length());
        }
        return trimmed;
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
