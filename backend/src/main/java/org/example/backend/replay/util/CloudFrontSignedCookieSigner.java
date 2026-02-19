package org.example.backend.replay.util;

import org.example.backend.media_asset.config.AwsProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

@Component
@ConditionalOnProperty(prefix = "aws.cloudfront", name = {"enabled", "key-pair-id", "private-key-path"})
public class CloudFrontSignedCookieSigner implements CloudFrontCookieSigner {

    private final String keyPairId;
    private final PrivateKey privateKey;

    // CloudFront 서명 설정을 초기화한다.
    public CloudFrontSignedCookieSigner(AwsProperties awsProperties) {
        AwsProperties.Cloudfront cloudfront = awsProperties.getCloudfront();
        this.keyPairId = requireText(cloudfront.getKeyPairId(), "cloudfront keyPairId");
        String privateKeyPath = requireText(cloudfront.getPrivateKeyPath(), "cloudfront privateKeyPath");
        this.privateKey = loadRsaPrivateKeyFromPath(privateKeyPath);
    }

    // CloudFront Signed Cookie를 발급한다.
    @Override
    public List<String> issueSignedCookies(String resourcePathPattern, Duration ttl) {
        long expiresAt = Instant.now().plusSeconds(ttl.getSeconds()).getEpochSecond();
        String policy = buildPolicy(resourcePathPattern, expiresAt);
        String encodedPolicy = encodeForCloudFront(policy.getBytes(StandardCharsets.UTF_8));
        byte[] signature = signPolicy(policy);
        String encodedSignature = encodeForCloudFront(signature);

        String policyCookie = "CloudFront-Policy=" + encodedPolicy + "; Path=/; HttpOnly; Secure";
        String signatureCookie = "CloudFront-Signature=" + encodedSignature + "; Path=/; HttpOnly; Secure";
        String keyPairCookie = "CloudFront-Key-Pair-Id=" + keyPairId + "; Path=/; HttpOnly; Secure";
        return List.of(policyCookie, signatureCookie, keyPairCookie);
    }

    // custom policy JSON을 생성한다.
    private String buildPolicy(String resourcePathPattern, long expiresAt) {
        return "{\"Statement\":[{\"Resource\":\"" + resourcePathPattern
                + "\",\"Condition\":{\"DateLessThan\":{\"AWS:EpochTime\":" + expiresAt + "}}}]}";
    }

    // policy를 RSA-SHA1으로 서명한다.
    private byte[] signPolicy(String policy) {
        try {
            Signature signer = Signature.getInstance("SHA1withRSA");
            signer.initSign(privateKey);
            signer.update(policy.getBytes(StandardCharsets.UTF_8));
            return signer.sign();
        } catch (Exception ex) {
            throw new IllegalStateException("CloudFront policy 서명 실패: " + ex.getMessage(), ex);
        }
    }

    // CloudFront 전용 base64 변환을 수행한다.
    private String encodeForCloudFront(byte[] data) {
        String base64 = Base64.getEncoder().encodeToString(data);
        return base64.replace("+", "-").replace("=", "_").replace("/", "~");
    }

    // PEM(-----BEGIN PRIVATE KEY----- 또는 -----BEGIN RSA PRIVATE KEY-----) 형태의 RSA private key를 파싱한다.
    private PrivateKey loadRsaPrivateKeyFromPem(String pem) {
        try {
            byte[] der;
            if (pem.contains("BEGIN RSA PRIVATE KEY")) {
                byte[] pkcs1 = decodePem(pem, "-----BEGIN RSA PRIVATE KEY-----", "-----END RSA PRIVATE KEY-----");
                der = convertPkcs1ToPkcs8(pkcs1);
            } else if (pem.contains("BEGIN PRIVATE KEY")) {
                der = decodePem(pem, "-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----");
            } else {
                throw new IllegalArgumentException("지원하지 않는 PEM 헤더입니다.");
            }
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(der);
            return KeyFactory.getInstance("RSA").generatePrivate(spec);
        } catch (Exception e) {
            throw new IllegalArgumentException("CloudFront private key 파싱 실패: " + e.getMessage(), e);
        }
    }

    // PEM 파일 경로에서 RSA private key를 로드한다.
    private PrivateKey loadRsaPrivateKeyFromPath(String path) {
        try {
            String pem = Files.readString(Path.of(path));
            return loadRsaPrivateKeyFromPem(pem);
        } catch (Exception e) {
            throw new IllegalArgumentException("CloudFront private key 파일 로드 실패: " + e.getMessage(), e);
        }
    }

    // PEM에서 base64 본문을 디코딩한다.
    private byte[] decodePem(String pem, String header, String footer) {
        String normalized = pem
                .replace(header, "")
                .replace(footer, "")
                .replaceAll("\\s", "");
        return Base64.getDecoder().decode(normalized);
    }

    // PKCS#1 RSA private key를 PKCS#8 형식으로 감싼다.
    private byte[] convertPkcs1ToPkcs8(byte[] pkcs1) {
        byte[] version = new byte[]{0x02, 0x01, 0x00};
        byte[] rsaOid = new byte[]{0x06, 0x09, 0x2A, (byte) 0x86, 0x48, (byte) 0x86, (byte) 0xF7, 0x0D, 0x01, 0x01, 0x01};
        byte[] nullParams = new byte[]{0x05, 0x00};
        byte[] algId = encodeSequence(rsaOid, nullParams);
        byte[] privateKeyOctet = encodeOctetString(pkcs1);
        return encodeSequence(version, algId, privateKeyOctet);
    }

    // DER SEQUENCE를 인코딩한다.
    private byte[] encodeSequence(byte[]... elements) {
        int totalLen = 0;
        for (byte[] element : elements) {
            totalLen += element.length;
        }
        byte[] lenBytes = encodeLength(totalLen);
        byte[] result = new byte[1 + lenBytes.length + totalLen];
        int offset = 0;
        result[offset++] = 0x30;
        System.arraycopy(lenBytes, 0, result, offset, lenBytes.length);
        offset += lenBytes.length;
        for (byte[] element : elements) {
            System.arraycopy(element, 0, result, offset, element.length);
            offset += element.length;
        }
        return result;
    }

    // DER OCTET STRING을 인코딩한다.
    private byte[] encodeOctetString(byte[] data) {
        byte[] lenBytes = encodeLength(data.length);
        byte[] result = new byte[1 + lenBytes.length + data.length];
        result[0] = 0x04;
        System.arraycopy(lenBytes, 0, result, 1, lenBytes.length);
        System.arraycopy(data, 0, result, 1 + lenBytes.length, data.length);
        return result;
    }

    // DER 길이 인코딩을 수행한다.
    private byte[] encodeLength(int length) {
        if (length < 128) {
            return new byte[]{(byte) length};
        }
        int temp = length;
        int numBytes = 0;
        while (temp > 0) {
            temp >>= 8;
            numBytes++;
        }
        byte[] result = new byte[1 + numBytes];
        result[0] = (byte) (0x80 | numBytes);
        for (int i = numBytes; i > 0; i--) {
            result[i] = (byte) (length & 0xFF);
            length >>= 8;
        }
        return result;
    }

    // 필수 문자열을 검증한다.
    private String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + "가 필요합니다.");
        }
        return value;
    }
}
