"use client";

import { useEffect, useState } from "react";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import { startShipping } from "@/lib/deliveryApi";
import { getArtistConsoleOrders } from "@/lib/orderApi";

const DELIVERY_STATUS_META = {
  READY: {
    label: "배송준비",
    className: "bg-violet-500/20 text-violet-300",
  },
  SHIPPING: {
    label: "배송중",
    className: "bg-sky-500/20 text-sky-300",
  },
  DELIVERED: {
    label: "배송완료",
    className: "bg-emerald-500/20 text-emerald-300",
  },
  ISSUE: {
    label: "배송이슈",
    className: "bg-rose-500/20 text-rose-300",
  },
  UNKNOWN: {
    label: "상태미확인",
    className: "bg-white/10 text-white/65",
  },
};

function getErrorMessage(error) {
  if (error?.data?.message) return error.data.message;
  if (error?.message) return error.message;
  return "요청 처리에 실패했습니다.";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR");
}

function formatAmount(value) {
  if (value == null || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value}원`;
  return `${amount.toLocaleString()}원`;
}

function normalizeOrders(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map((item) => ({
    orderId: item.orderId,
    orderNo: item.orderNo,
    orderName: item.orderName,
    totalAmount: item.totalAmount,
    orderedAt: item.orderedAt,
    deliveryId: item.deliveryId,
    deliveryStatus: item.deliveryStatus || "UNKNOWN",
    courierCode: item.courierCode || "",
    trackingNumber: item.trackingNumber || "",
  }));
}

export default function ArtistOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [submittingOrderId, setSubmittingOrderId] = useState(null);
  const [form, setForm] = useState({ courier: "04", number: "" });

  useEffect(() => {
    let mounted = true;

    getArtistConsoleOrders()
      .then((data) => {
        if (!mounted) return;
        setOrders(normalizeOrders(data));
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const openEditor = (order) => {
    setEditingOrderId(order.orderId);
    setForm({
      courier: order.courierCode || "04",
      number: order.trackingNumber || "",
    });
  };

  const cancelEditor = () => {
    setEditingOrderId(null);
    setSubmittingOrderId(null);
    setForm({ courier: "04", number: "" });
  };

  const submitTracking = async (order) => {
    const courier = form.courier.trim();
    const number = form.number.trim();

    if (!courier || !number) {
      alert("택배사 코드와 운송장 번호를 입력해 주세요.");
      return;
    }

    setSubmittingOrderId(order.orderId);
    try {
      await startShipping(order.deliveryId, courier, number);
      setOrders((prev) =>
        prev.map((item) =>
          item.orderId === order.orderId
            ? {
                ...item,
                deliveryStatus: "SHIPPING",
                courierCode: courier,
                trackingNumber: number,
              }
            : item
        )
      );
      alert("송장 등록이 완료되었습니다.");
      cancelEditor();
    } catch (error) {
      alert(getErrorMessage(error));
      setSubmittingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-6xl mx-auto">
        <p className="text-sm text-white/65">주문 데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto space-y-8">
      <header>
        <SectionTitle className="text-2xl font-bold">주문 관리</SectionTitle>
        <p className="text-sm text-white/55 font-medium mt-1">
          굿즈 주문 내역을 확인하고 배송을 관리하세요.
        </p>
      </header>

      {loadError && (
        <Surface variant="primary" className="p-5 border border-rose-400/35">
          <p className="text-xs text-rose-300 font-semibold">{loadError}</p>
        </Surface>
      )}

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">
                주문번호 / 일자
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">
                상품명
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">
                금액
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">
                상태
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-sm text-white/55 text-center">
                  배송 관리 가능한 주문이 없습니다.
                </td>
              </tr>
            )}
            {orders.map((order) => {
              const isEditing = editingOrderId === order.orderId;
              const isSubmitting = submittingOrderId === order.orderId;
              const statusMeta = DELIVERY_STATUS_META[order.deliveryStatus] || DELIVERY_STATUS_META.UNKNOWN;
              const canEditTracking = order.deliveryId && order.deliveryStatus === "READY";

              return (
                <tr
                  key={order.orderId}
                  className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-6 py-5">
                    <p className="font-bold text-white">#{order.orderNo}</p>
                    <p className="text-[10px] text-white/55">{formatDate(order.orderedAt)}</p>
                  </td>
                  <td className="px-6 py-5 font-medium text-white/80">{order.orderName}</td>
                  <td className="px-6 py-5 font-black text-white tabular-nums">
                    {formatAmount(order.totalAmount)}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {!isEditing && canEditTracking && (
                      <button
                        type="button"
                        onClick={() => openEditor(order)}
                        className="text-[11px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                      >
                        송장 입력
                      </button>
                    )}

                    {!isEditing && !canEditTracking && order.trackingNumber && (
                      <div className="text-[10px] text-white/70 space-y-0.5">
                        <p>택배사: {order.courierCode || "-"}</p>
                        <p>운송장: {order.trackingNumber}</p>
                      </div>
                    )}

                    {isEditing && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={form.courier}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, courier: e.target.value }))
                            }
                            placeholder="택배사"
                            className="w-20 px-2 py-1 text-xs rounded bg-[#201a33] border border-white/10 text-white"
                          />
                          <input
                            value={form.number}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, number: e.target.value }))
                            }
                            placeholder="운송장 번호"
                            className="w-40 px-2 py-1 text-xs rounded bg-[#201a33] border border-white/10 text-white"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => submitTracking(order)}
                            disabled={isSubmitting}
                            className="text-[10px] font-black text-sky-300 uppercase tracking-widest disabled:opacity-50"
                          >
                            {isSubmitting ? "등록중..." : "등록"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditor}
                            disabled={isSubmitting}
                            className="text-[10px] font-black text-white/60 uppercase tracking-widest disabled:opacity-50"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}
