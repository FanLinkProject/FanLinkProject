package org.example.backend.media_asset.entity;

// 검증 실패 사유
public enum MediaAssetRejectedReason {
    NOT_FOUND,
    INVALID_OBJECT_KEY,
    HEAD_NOT_FOUND,
    CONTENT_TYPE_MISMATCH,
    SIZE_EXCEEDED,
    POLICY_VIOLATION
}
