package org.example.backend.ticket.util;

import io.jsonwebtoken.Jwts;
import org.example.backend.ticket.config.TicketProperties;
import org.example.backend.ticket.entity.Ticket;
import org.example.backend.ticket.exception.TicketErrorCode;
import org.example.backend.ticket.exception.TicketException;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Date;

@Component
public class TicketJwtSigner {

    private final PrivateKey privateKey;
    private final PublicKey publicKey;
    private final int qrExpireHours;

    public TicketJwtSigner(TicketProperties properties) {
        this.privateKey = loadPrivateKey(properties);
        this.publicKey = loadPublicKey(properties);
        this.qrExpireHours = properties.getQrExpireHours() > 0 ? properties.getQrExpireHours() : 48;
    }

    private static PrivateKey loadPrivateKey(TicketProperties properties) {
        String pemContent = properties.getPrivateKey();
        if (pemContent != null && !pemContent.isBlank()) {
            return parsePrivateKeyFromPem(normalizePem(pemContent));
        }
        String path = properties.getPrivateKeyPath();
        if (path == null || path.isBlank()) {
            return null;
        }
        Path resolved = resolveKeyPath(path, "private.pem");
        if (resolved == null) {
            throw new IllegalStateException("티켓 Private Key 파일을 찾을 수 없습니다: " + path);
        }
        try {
            String pem = Files.readString(resolved);
            return parsePrivateKeyFromPem(pem);
        } catch (Exception e) {
            throw new IllegalStateException("티켓 Private Key 로드 실패: " + resolved, e);
        }
    }

    private static PrivateKey parsePrivateKeyFromPem(String pem) {
        try {
            String base64 = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] decoded = Base64.getDecoder().decode(base64);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
            return KeyFactory.getInstance("RSA").generatePrivate(spec);
        } catch (Exception e) {
            throw new IllegalStateException("티켓 Private Key 파싱 실패", e);
        }
    }

    private static PublicKey loadPublicKey(TicketProperties properties) {
        String pemContent = properties.getPublicKey();
        if (pemContent != null && !pemContent.isBlank()) {
            return parsePublicKeyFromPem(normalizePem(pemContent));
        }
        String path = properties.getPublicKeyPath();
        if (path == null || path.isBlank()) {
            return null;
        }
        Path resolved = resolveKeyPath(path, "public.pem");
        if (resolved == null) {
            throw new IllegalStateException("티켓 Public Key 파일을 찾을 수 없습니다: " + path);
        }
        try {
            String pem = Files.readString(resolved);
            return parsePublicKeyFromPem(pem);
        } catch (Exception e) {
            throw new IllegalStateException("티켓 Public Key 로드 실패: " + resolved, e);
        }
    }

    private static PublicKey parsePublicKeyFromPem(String pem) {
        try {
            String base64 = pem.replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] decoded = Base64.getDecoder().decode(base64);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(decoded);
            return KeyFactory.getInstance("RSA").generatePublic(spec);
        } catch (Exception e) {
            throw new IllegalStateException("티켓 Public Key 파싱 실패", e);
        }
    }

    /** env에 \n으로 넣은 PEM을 실제 줄바꿈으로 치환 */
    private static String normalizePem(String pem) {
        return pem.replace("\\n", "\n");
    }

    /**
     * 프로젝트 루트/backend 디렉터리에서 실행 시 모두 동작하도록 경로 fallback.
     * ticket-keys/private.pem → ticket-keys/ 또는 backend/ticket-keys/ 시도
     */
    private static Path resolveKeyPath(String pathStr, String fileName) {
        Path path = Path.of(pathStr);
        List<Path> candidates = pathStr.contains("backend/") || pathStr.contains("backend\\")
                ? List.of(path, Path.of("ticket-keys", fileName))
                : List.of(path, Path.of("backend", "ticket-keys", fileName));
        for (Path p : candidates) {
            if (Files.isRegularFile(p)) {
                return p;
            }
        }
        return null;
    }

    public String createTicketJwt(Ticket ticket) {
        if (privateKey == null) {
            throw new TicketException(TicketErrorCode.TICKET_SIGNING_NOT_CONFIGURED);
        }

        Date now = new Date();
        Date exp = new Date(now.getTime() + qrExpireHours * 3600L * 1000);

        return Jwts.builder()
                .claim("tid", ticket.getTicketCode())
                .claim("eid", ticket.getConcertId())
                .issuedAt(now)
                .expiration(exp)
                .signWith(privateKey)
                .compact();
    }

    public boolean isConfigured() {
        return privateKey != null && publicKey != null;
    }

    public PublicKey getPublicKey() {
        return publicKey;
    }
}
