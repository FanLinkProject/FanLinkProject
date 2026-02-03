package org.example.backend.settlement.enums;

public enum SettlementStatus {
    COMPLETE,   // 정산 및 지급 처리 완료 (배치 생성 즉시 이 상태)
    CANCELED    // (예외적 상황) 지급 후 환수 발생 시
}