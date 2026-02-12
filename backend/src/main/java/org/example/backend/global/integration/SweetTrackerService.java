package org.example.backend.global.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.example.backend.delivery.entity.Delivery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Slf4j
@Service
@Order(2) // 2순위: 국내 배송용
public class SweetTrackerService implements DeliveryTracker {

    @Value("${external.sweettracker.api-key:DUMMY}")
    private String apiKey;

    @Value("${external.sweettracker.enabled:false}")
    private boolean enabled;

    private static final String BASE_URL = "http://info.sweettracker.co.kr/api/v1/trackingInfo";
    private final OkHttpClient client = new OkHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 국내 배송 추적 지원 여부 확인
     * - API 키가 유효하고 활성화되어 있어야 함
     * - 택배사 코드가 숫자로만 이루어져 있거나, Delivery가 국내 배송인 경우
     */
    @Override
    public boolean isSupported(String courierCode) {
        if (!enabled || apiKey == null || apiKey.equals("DUMMY") || apiKey.equals("YOUR_SWEETTRACKER_API_KEY_HERE")) {
            return false;
        }
        // 국내 택배사 코드: 숫자로만 이루어진 코드 (예: "04", "01")
        return courierCode != null && courierCode.matches("\\d+");
    }

    /**
     * Delivery 엔티티를 받아서 국내 배송인지 확인하는 오버로드 메서드
     */
    public boolean isSupported(Delivery delivery) {
        if (!enabled || apiKey == null || apiKey.equals("DUMMY") || apiKey.equals("YOUR_SWEETTRACKER_API_KEY_HERE")) {
            return false;
        }
        // 국내 배송인 경우 지원
        return delivery != null && delivery.isDomestic();
    }

    @Override
    public String getDeliveryStatus(String courierCode, String trackingNumber) {
        // URL 만들기
        HttpUrl.Builder urlBuilder = HttpUrl.parse(BASE_URL).newBuilder();
        urlBuilder.addQueryParameter("t_key", apiKey);
        urlBuilder.addQueryParameter("t_code", courierCode);
        urlBuilder.addQueryParameter("t_invoice", trackingNumber);

        Request request = new Request.Builder().url(urlBuilder.build()).get().build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                log.error("SweetTracker API 호출 실패: {}", response.code());
                return "ERROR";
            }
            String body = response.body().string();
            JsonNode root = objectMapper.readTree(body);

            // 결과 확인
            if ("N".equals(root.path("result").asText())) return "NOT_FOUND";

            return mapLevelToStatus(root.path("level").asInt());
        } catch (IOException e) {
            log.error("SweetTracker Error", e);
            return "ERROR";
        }
    }

    private String mapLevelToStatus(int level) {
        switch (level) {
            case 1: return "Pending";
            case 6: return "Delivered";
            default: return "InTransit";
        }
    }
}