package org.example.backend.global.integration;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.example.backend.delivery.entity.Delivery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import java.io.IOException;

@Slf4j
@Service
@Order(3) // 3순위: 해외 배송용
public class AfterShipService implements DeliveryTracker {

    @Value("${external.aftership.api-key:DUMMY}")
    private String apiKey;

    @Value("${external.aftership.base-url}")
    private String baseUrl;

    @Value("${external.aftership.enabled:false}")
    private boolean enabled;

    private final OkHttpClient client = new OkHttpClient();

    /**
     * 해외 배송 추적 지원 여부 확인
     * - API 키가 유효하고 활성화되어 있어야 함
     * - 택배사 코드가 "TEST"가 아니고, 숫자가 아닌 문자열인 경우 (해외 택배사 코드)
     */
    @Override
    public boolean isSupported(String courierCode) {
        if (!enabled || apiKey == null || apiKey.equals("DUMMY") || apiKey.equals("YOUR_AFTERSHIP_API_KEY_HERE")) {
            return false;
        }
        // 해외 택배사 코드: "TEST"가 아니고, 숫자가 아닌 문자열 (예: "dhl", "fedex")
        return courierCode != null
                && !courierCode.equals("TEST")
                && !courierCode.matches("\\d+");
    }

    /**
     * Delivery 엔티티를 받아서 해외 배송인지 확인하는 오버로드 메서드
     */
    public boolean isSupported(Delivery delivery) {
        if (!enabled || apiKey == null || apiKey.equals("DUMMY") || apiKey.equals("YOUR_AFTERSHIP_API_KEY_HERE")) {
            return false;
        }
        // 해외 배송인 경우 지원
        return delivery != null && !delivery.isDomestic();
    }

    @Override
    public String getDeliveryStatus(String courierCode, String trackingNumber) {
        String requestUrl = baseUrl + "/trackings/" + courierCode + "/" + trackingNumber;

        Request request = new Request.Builder()
                .url(requestUrl)
                .addHeader("aftership-api-key", apiKey)
                .addHeader("Content-Type", "application/json")
                .get()
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                if (response.code() == 404) return "NOT_FOUND";
                return "ERROR";
            }
            String responseBody = response.body().string();
            JsonObject jsonObject = JsonParser.parseString(responseBody).getAsJsonObject();
            return jsonObject.getAsJsonObject("data").getAsJsonObject("tracking").get("tag").getAsString();
        } catch (IOException e) {
            log.error("AfterShip Error", e);
            return "ERROR";
        }
    }
}