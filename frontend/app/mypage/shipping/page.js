"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { getMypage } from "@/lib/userApi";
import { getDelivery } from "@/lib/deliveryApi";

const orderStatusLabel = (s) => {
  if (!s) return "준비 중";
  const map = {
    PENDING: "결제 대기",
    COMPLETED: "완료",
    CANCELED: "취소",
    FAILED: "실패",
  };
  return map[s] || s;
};

export default function ShippingInfoPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [trackingDeliveryId, setTrackingDeliveryId] = useState(null);
  const [trackingDetail, setTrackingDetail] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    getMypage()
      .then((data) => {
        setOrders(data.purchaseHistory ?? []);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const handleTrack = (deliveryId) => {
    if (!deliveryId) return;
    setTrackingDeliveryId(deliveryId);
    setTrackingDetail(null);
    setTrackingLoading(true);
    getDelivery(deliveryId)
      .then((res) => setTrackingDetail(res))
      .catch(() => setTrackingDetail(null))
      .finally(() => setTrackingLoading(false));
  };

  const closeTracking = () => {
    setTrackingDeliveryId(null);
    setTrackingDetail(null);
  };

  const defaultAddress = trackingDetail
    ? `${trackingDetail.address || ""} ${trackingDetail.detailAddress || ""}`.trim() || "—"
    : "주문 시 등록된 배송지를 확인하세요.";

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <SectionTitle className="text-2xl font-bold">배송 정보</SectionTitle>
        <Link
          href="/mypage"
          className="size-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.1] transition-all"
        >
          <span className="material-symbols-outlined">close</span>
        </Link>
      </header>

      <Surface variant="primary" className="p-10">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-white">기본 배송지</h3>
          <span className="text-xs font-bold text-white/45">(주문별 배송지 표시)</span>
        </div>
        <div className="space-y-2">
          <p className="text-white/70 font-medium">{defaultAddress}</p>
        </div>
      </Surface>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white px-2">주문별 배송 상태</h3>
        {loading ? (
          <p className="text-white/55 font-medium py-8">로딩 중...</p>
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <Surface variant="primary" className="py-16 text-center">
                <p className="text-white/55 italic">주문 내역이 없습니다.</p>
              </Surface>
            ) : (
              orders.map((order) => (
                <Surface key={order.orderId} variant="primary" className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest">
                      #{order.orderNo}
                    </span>
                    <span
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        order.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-violet-500/20 text-violet-300"
                      }`}
                    >
                      {orderStatusLabel(order.status)}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{order.orderName}</h4>
                  <div className="space-y-1">
                    {order.deliveryId && (
                      <p className="text-sm text-white/70 font-medium">
                        <span className="text-white/55 mr-2">배송 ID:</span> {order.deliveryId}
                      </p>
                    )}
                  </div>
                  <div className="mt-6 flex gap-3">
                    {order.deliveryId ? (
                      <Button
                        variant="primary"
                        className="flex-1 py-3 text-[11px] uppercase tracking-widest"
                        onClick={() => handleTrack(order.deliveryId)}
                      >
                        배송 추적
                      </Button>
                    ) : (
                      <span className="text-[11px] text-white/45 py-3">운송장 등록 후 추적 가능</span>
                    )}
                    <Button variant="ghost" className="flex-1 py-3 text-[11px] uppercase tracking-widest" disabled>
                      구매 확정 (준비 중)
                    </Button>
                  </div>
                  {trackingDeliveryId === order.deliveryId && (
                    <div className="mt-6 pt-6 border-t border-white/[0.06]">
                      {trackingLoading ? (
                        <p className="text-white/55 text-sm">조회 중...</p>
                      ) : trackingDetail ? (
                        <div className="space-y-2 text-sm">
                          <p className="text-white/90 font-bold">수령인: {trackingDetail.recipientName}</p>
                          <p className="text-white/70">주소: {trackingDetail.address} {trackingDetail.detailAddress}</p>
                          <p className="text-white/70">택배사: {trackingDetail.courierCode || "—"} / 운송장: {trackingDetail.trackingNumber || "—"}</p>
                          <p className="text-violet-300 font-bold">상태: {trackingDetail.status} ({trackingDetail.trackingStatus})</p>
                          <button
                            type="button"
                            onClick={closeTracking}
                            className="text-[10px] text-white/55 hover:text-violet-300"
                          >
                            접기
                          </button>
                        </div>
                      ) : (
                        <p className="text-white/55 text-sm">조회 실패</p>
                      )}
                    </div>
                  )}
                </Surface>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
