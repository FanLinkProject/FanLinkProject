package org.example.backend.candy.dto;

import org.example.backend.candy.entity.CandyType;

/**
 * 캔디 생성/수정 요청
 * 사용: CandyController (POST /api/candies, PUT /api/candies/{id}), CandyService.create, update
 * paymentId: 결제 연동 시 NOT NULL, 이벤트 지급/단순 사용 시 null
 */
public record CandyRequest(
        Long userId,
        Long amount,
        CandyType type,
        Long paymentId
) {
}
