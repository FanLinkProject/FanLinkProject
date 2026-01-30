package org.example.backend.media_asset.entity;

// 업로드 진행 상태
public enum MediaAssetStatus {
    INITIATED,
    READY,
    REJECTED,
    ORPHAN,
    DELETED
}
