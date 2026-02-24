"use client";

import { useState, useRef } from "react";

/**
 * 드래그로 순서를 변경할 수 있는 첨부파일 그리드.
 * 첫 번째 항목이 자동으로 '대표'가 됨.
 *
 * @param {Array<{ mediaAssetId: number; url: string; isVideo?: boolean }>} attachments
 * @param {number | null} representativeId - 대표 mediaAssetId
 * @param {(mediaAssetId: number) => void} onSetRepresentative
 * @param {(fromIndex: number, toIndex: number) => void} onReorder
 * @param {(mediaAssetId: number) => void} onRemove
 */
export default function DraggableAttachmentGrid({
  attachments,
  representativeId,
  onSetRepresentative,
  onReorder,
  onRemove,
}) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragCounter = useRef({});

  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e, idx) => {
    e.preventDefault();
    dragCounter.current[idx] = (dragCounter.current[idx] || 0) + 1;
    if (dragIdx !== null && idx !== dragIdx) setOverIdx(idx);
  };

  const handleDragLeave = (e, idx) => {
    dragCounter.current[idx] = (dragCounter.current[idx] || 0) - 1;
    if (dragCounter.current[idx] <= 0) {
      dragCounter.current[idx] = 0;
      if (overIdx === idx) setOverIdx(null);
    }
  };

  const handleDrop = (e, toIdx) => {
    e.preventDefault();
    const fromIdx = dragIdx;
    dragCounter.current = {};
    setDragIdx(null);
    setOverIdx(null);
    if (fromIdx != null && fromIdx !== toIdx) {
      onReorder(fromIdx, toIdx);
    }
  };

  const handleDragEnd = () => {
    dragCounter.current = {};
    setDragIdx(null);
    setOverIdx(null);
  };

  if (!attachments?.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {attachments.map((p, idx) => {
        const isRep = p.mediaAssetId === representativeId;
        const isDragging = dragIdx === idx;
        const isOver = overIdx === idx && dragIdx !== idx;

        return (
          <div
            key={p.mediaAssetId}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, idx)}
            onDragLeave={(e) => handleDragLeave(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onClick={() => onSetRepresentative(p.mediaAssetId)}
            className={`relative rounded-2xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all select-none ${
              isDragging
                ? "opacity-40 scale-95"
                : isOver
                ? "border-violet-400 ring-2 ring-violet-400/40 scale-[1.02]"
                : isRep
                ? "border-violet-500 ring-1 ring-violet-500/30"
                : "border-white/[0.08] hover:border-white/20"
            }`}
          >
            {p.isVideo ? (
              <div className="w-full aspect-video bg-black/30 flex flex-col items-center justify-center gap-1">
                <span className="material-symbols-outlined text-4xl text-white/40">videocam</span>
                <span className="text-[9px] text-white/30 font-bold">VIDEO</span>
              </div>
            ) : (
              <img
                src={p.url}
                alt={`첨부 ${idx + 1}`}
                className="w-full aspect-video object-cover bg-black/20 pointer-events-none"
                draggable={false}
              />
            )}

            {isRep && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-violet-600 text-[9px] font-bold text-white pointer-events-none">
                대표
              </span>
            )}

            {/* 순서 뱃지 */}
            <span className="absolute bottom-2 left-2 size-5 rounded-full bg-black/60 text-[9px] font-bold text-white flex items-center justify-center pointer-events-none">
              {idx + 1}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(p.mediaAssetId);
              }}
              className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>

            {/* 드래그 핸들 힌트 */}
            <span className="absolute bottom-2 right-2 material-symbols-outlined text-white/30 text-sm pointer-events-none">
              drag_indicator
            </span>
          </div>
        );
      })}
    </div>
  );
}
