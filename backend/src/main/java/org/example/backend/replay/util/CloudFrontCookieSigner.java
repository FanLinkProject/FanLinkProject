package org.example.backend.replay.util;

import java.time.Duration;
import java.util.List;

public interface CloudFrontCookieSigner {

    // CloudFront Signed Cookie를 발급한다.
    List<String> issueSignedCookies(String resourcePathPattern, Duration ttl);
}
