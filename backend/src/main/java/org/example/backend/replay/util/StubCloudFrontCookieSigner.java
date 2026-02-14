package org.example.backend.replay.util;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

@Component
public class StubCloudFrontCookieSigner implements CloudFrontCookieSigner {

    // 개발/테스트용 가짜 Signed Cookie를 발급한다.
    @Override
    public List<String> issueSignedCookies(String resourcePathPattern, Duration ttl) {
        String policy = "CloudFront-Policy=fake-policy; Path=/; HttpOnly; Secure";
        String signature = "CloudFront-Signature=fake-signature; Path=/; HttpOnly; Secure";
        String keyPairId = "CloudFront-Key-Pair-Id=fake-keypair; Path=/; HttpOnly; Secure";
        return List.of(policy, signature, keyPairId);
    }
}
