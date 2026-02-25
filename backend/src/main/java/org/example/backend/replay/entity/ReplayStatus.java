package org.example.backend.replay.entity;

public enum ReplayStatus {

    /** 수동 업로드: 슬롯 생성됨, 영상 업로드 대기 */
    UPLOADING,
    /** 변환 중 (MediaConvert) */
    VALIDATING,
    /** HLS 변환 완료, 미발행 */
    READY,
    /** 공개 발행됨 */
    PUBLISHED,
    /** 변환 실패 등으로 거부됨 */.
    REJECTED
}
