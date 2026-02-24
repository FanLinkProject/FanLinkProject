"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { getMypage } from "@/lib/userApi";
import { getDelivery, getDeliveryHistory } from "@/lib/deliveryApi";

const ORDER_STATUS_LABEL = {
  PENDING: "결제 대기",
  COMPLETED: "결제 완료",
  CANCELED: "취소",
  FAILED: "실패",
};

const DELIVERY_STATUS_LABEL = {
  READY: "배송 준비",
  SHIPPING: "배송 중",
  DELIVERED: "배송 완료",
  ISSUE: "배송 이슈",
  UNKNOWN: "상태 미확인",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
}

function formatMoney(value) {
  if (value == null) return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value}`;
  return `${amount.toLocaleString()}원`;
}

function orderStatusLabel(status) {
  return ORDER_STATUS_LABEL[status] || status || "-";
}

function deliveryStatusLabel(status) {
  return DELIVERY_STATUS_LABEL[status] || status || "-";
}

export default function ShippingInfoPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [orders, setOrders] = useState([]);

  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [trackingDetail, setTrackingDetail] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);

  useEffect(() => {
    let mounted = true;

    getMypage({ page: 0, size: 30 })
      .then((data) => {
        if (!mounted) return;
        setOrders(Array.isArray(data?.purchaseHistory) ? data.purchaseHistory : []);
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(
          error?.data?.message ||
            error?.message ||
            "배송 정보를 불러오지 못했습니다."
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.deliveryId === selectedDeliveryId) || null,
    [orders, selectedDeliveryId]
  );

  const closeTracking = () => {
    setSelectedDeliveryId(null);
    setTrackingDetail(null);
    setTrackingHistory([]);
    setTrackingError("");
  };

  const handleTrack = async (deliveryId) => {
    if (!deliveryId) return;

    setSelectedDeliveryId(deliveryId);
    setTrackingLoading(true);
    setTrackingError("");
    setTrackingDetail(null);
    setTrackingHistory([]);

    try {
      const [detail, history] = await Promise.all([
        getDelivery(deliveryId),
        getDeliveryHistory(deliveryId),
      ]);
      setTrackingDetail(detail);
      setTrackingHistory(Array.isArray(history) ? history : []);
    } catch (error) {
      setTrackingError(
        error?.data?.message || error?.message || "배송 조회에 실패했습니다."
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <SectionTitle className="text-2xl font-bold">배송 조회</SectionTitle>
        <Link
          href="/mypage"
          className="size-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.1] transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </Link>
      </header>

      {loading && (
        <Surface variant="primary" className="p-8">
          <p className="text-white/70">주문/배송 정보를 불러오는 중입니다...</p>
        </Surface>
      )}

      {!loading && loadError && (
        <Surface variant="primary" className="p-8 border border-rose-400/40">
          <p className="text-rose-300 text-sm font-medium mb-4">{loadError}</p>
          <Button variant="primary" className="py-2.5 px-5 text-xs" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </Surface>
      )}

      {!loading && !loadError && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Surface variant="primary" className="p-10 text-center">
              <p className="text-white/60">표시할 주문 내역이 없습니다.</p>
            </Surface>
          ) : (
            orders.map((order) => (
              <Surface key={order.orderId} variant="primary" className="p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[11px] text-violet-300 font-black tracking-widest">
                      #{order.orderNo}
                    </p>
                    <h3 className="text-lg font-bold text-white mt-1">{order.orderName}</h3>
                    <p className="text-xs text-white/55 mt-1">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/[0.08] text-white/85">
                    {orderStatusLabel(order.status)}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
                  <p className="text-white/70">
                    총 결제금액: <span className="text-white font-semibold">{formatMoney(order.totalAmount)}</span>
                  </p>
                  <p className="text-white/70">
                    배송 ID: <span className="text-white font-semibold">{order.deliveryId ?? "-"}</span>
                  </p>
                </div>

                {order.deliveryId ? (
                  <Button
                    variant="primary"
                    className="py-2.5 px-5 text-xs uppercase tracking-widest"
                    onClick={() => handleTrack(order.deliveryId)}
                  >
                    배송 상세 보기
                  </Button>
                ) : (
                  <p className="text-xs text-white/50">배송이 필요하지 않은 주문입니다.</p>
                )}
              </Surface>
            ))
          )}
        </div>
      )}

      {selectedDeliveryId && (
        <Surface variant="primary" className="p-8 border border-violet-400/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              배송 상세 {selectedOrder?.orderNo ? `(#${selectedOrder.orderNo})` : ""}
            </h3>
            <button
              type="button"
              className="text-xs text-white/55 hover:text-white"
              onClick={closeTracking}
            >
              닫기
            </button>
          </div>

          {trackingLoading && <p className="text-white/70 text-sm">배송 정보를 조회하는 중입니다...</p>}

          {!trackingLoading && trackingError && (
            <p className="text-rose-300 text-sm font-medium">{trackingError}</p>
          )}

          {!trackingLoading && !trackingError && trackingDetail && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <p className="text-white/75">
                  수령인: <span className="text-white font-semibold">{trackingDetail.recipientName || "-"}</span>
                </p>
                <p className="text-white/75">
                  택배사: <span className="text-white font-semibold">{trackingDetail.courierCode || "-"}</span>
                </p>
                <p className="text-white/75">
                  운송장: <span className="text-white font-semibold">{trackingDetail.trackingNumber || "-"}</span>
                </p>
                <p className="text-white/75">
                  현재 상태:{" "}
                  <span className="text-white font-semibold">
                    {deliveryStatusLabel(trackingDetail.status)} ({trackingDetail.trackingStatus || "-"})
                  </span>
                </p>
                <p className="text-white/75 sm:col-span-2">
                  주소:{" "}
                  <span className="text-white font-semibold">
                    {`${trackingDetail.address || ""} ${trackingDetail.detailAddress || ""}`.trim() || "-"}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-white mb-2">상태 변경 이력</p>
                {trackingHistory.length === 0 ? (
                  <p className="text-xs text-white/50">아직 기록된 변경 이력이 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {trackingHistory.map((item, idx) => (
                      <li
                        key={`${item.createdAt || "na"}-${idx}`}
                        className="text-xs text-white/70 border border-white/[0.08] rounded-lg px-3 py-2"
                      >
                        <span className="text-white/55 mr-2">{formatDateTime(item.createdAt)}</span>
                        <span>{item.fromStatus || "-"} {"->"} {item.toStatus || "-"}</span>
                        <span className="text-white/50 ml-2">({item.reason || "N/A"})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Surface>
      )}
    </div>
  );
}
