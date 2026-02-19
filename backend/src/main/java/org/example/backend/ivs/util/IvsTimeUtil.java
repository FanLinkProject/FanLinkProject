package org.example.backend.ivs.util;

import org.springframework.stereotype.Component;

@Component
public class IvsTimeUtil {

    // ttlSeconds 기반 추천 리프레시 시간을 계산한다.
    public int recommendedRefreshSeconds(int ttlSeconds) {
        if (ttlSeconds <= 1) {
            return Math.max(0, ttlSeconds - 1);
        }
        int refresh = (int) Math.floor(ttlSeconds * 0.8);
        if (refresh < 1) {
            refresh = 1;
        }
        if (refresh >= ttlSeconds) {
            refresh = ttlSeconds - 1;
        }
        return refresh;
    }
}
