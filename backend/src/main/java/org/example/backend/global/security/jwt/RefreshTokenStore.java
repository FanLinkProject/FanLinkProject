package org.example.backend.global.security.jwt;

import org.springframework.stereotype.Component;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RefreshTokenStore {
    private final ConcurrentHashMap<String, String> tokenStore = new ConcurrentHashMap<>();

    public void save(String email, String refreshToken) {
        tokenStore.put(email, refreshToken);
    }

    public String get(String email) {
        return tokenStore.get(email);
    }


    public void delete(String email) {
        tokenStore.remove(email);
    }

    // RefreshToken 존재 여부 확인
    public boolean exists(String email) {
        return tokenStore.containsKey(email);
    }
}
