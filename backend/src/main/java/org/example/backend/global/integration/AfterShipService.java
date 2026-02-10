package org.example.backend.global.integration;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
//import org.springframework.context.annotation.Primary; // 목업서비스 사용..
import org.springframework.stereotype.Service;

import java.io.IOException;

@Slf4j
@Service
//@Primary 목업서비스 사용..
public class AfterShipService implements DeliveryTracker{

    @Value("${external.aftership.api-key}")
    private String apiKey;

    @Value("${external.aftership.base-url}")
    private String baseUrl;

    private final OkHttpClient client = new OkHttpClient();

    /**
     * 배송 상태 조회
     * @param courierCode 택배사 코드 (예: dhl, fedex, cj-gls)
     * @param trackingNumber 운송장 번호
     */
    @Override
    public String getDeliveryStatus(String courierCode, String trackingNumber) {
        // API 요청 URL 생성
        String requestUrl = baseUrl + "/trackings/" + courierCode + "/" + trackingNumber;

        Request request = new Request.Builder()
                .url(requestUrl)
                .addHeader("aftership-api-key", apiKey)
                .addHeader("Content-Type", "application/json")
                .get()
                .build();

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                log.error("AfterShip API 호출 실패: 코드={}, 메시지={}", response.code(), response.message());
                // 404라면 아직 등록되지 않은 운송장일 수 있음 -> "정보 없음" 리턴
                if (response.code() == 404) return "NOT_FOUND";
                return "ERROR";
            }

            String responseBody = response.body().string();
            // JSON 파싱: data -> tracking -> tag
            JsonObject jsonObject = JsonParser.parseString(responseBody).getAsJsonObject();
            String status = jsonObject.getAsJsonObject("data")
                    .getAsJsonObject("tracking")
                    .get("tag").getAsString();

            log.info("배송 조회 성공: {} - {}", trackingNumber, status);
            return status; // 예: InTransit, Delivered

        } catch (IOException e) {
            log.error("AfterShip 연동 중 예외 발생", e);
            return "ERROR";
        }
    }
}