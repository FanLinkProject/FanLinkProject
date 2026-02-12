package org.example.backend.ivs.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.nio.file.Files;
import java.nio.file.Path;

public class IvsPlaybackTokenSigner {

    // PEM(-----BEGIN PRIVATE KEY-----) 형태의 EC private key를 PKCS8로 파싱한다.
    public PrivateKey loadEcPrivateKeyFromPem(String pem) {
        try {
            String normalized = pem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] der = Base64.getDecoder().decode(normalized);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(der);
            return KeyFactory.getInstance("EC").generatePrivate(spec);
        } catch (Exception e) {
            throw new IllegalArgumentException("IVS private key 파싱 실패: " + e.getMessage(), e);
        }
    }

    // PEM 파일 경로에서 EC private key를 로드한다.
    public PrivateKey loadEcPrivateKeyFromPath(String path) {
        try {
            String pem = Files.readString(Path.of(path));
            return loadEcPrivateKeyFromPem(pem);
        } catch (Exception e) {
            throw new IllegalArgumentException("IVS private key 파일 로드 실패: " + e.getMessage(), e);
        }
    }

    // IVS Playback Authorization JWT를 생성한다.
    public String createToken(String channelArn, int ttlSeconds, PrivateKey privateKey, Long userId) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(ttlSeconds);

        Map<String, Object> claims = new HashMap<>();
        claims.put("aws:channel-arn", channelArn);
        if (userId != null) {
            claims.put("sub", String.valueOf(userId));
        }
        claims.put("jti", UUID.randomUUID().toString());

        return Jwts.builder()
                .setHeaderParam("typ", "JWT")
                .setClaims(claims)
                .setExpiration(Date.from(exp))
                .signWith(privateKey, SignatureAlgorithm.ES384)
                .compact();
    }
}
