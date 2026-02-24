"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SectionTitle from "@/components/ui/SectionTitle";
import Surface from "@/components/ui/Surface";
import { request } from "@/lib/api";
import { startShipping } from "@/lib/deliveryApi";
import { getArtistConsoleOrders } from "@/lib/orderApi";

const DELIVERY_STATUS_META = {
  READY: { label: "배송준비", className: "bg-violet-500/20 text-violet-300" },
  SHIPPING: { label: "배송중", className: "bg-sky-500/20 text-sky-300" },
  DELIVERED: { label: "배송완료", className: "bg-emerald-500/20 text-emerald-300" },
  ISSUE: { label: "배송이슈", className: "bg-rose-500/20 text-rose-300" },
  UNKNOWN: { label: "상태 미확인", className: "bg-white/10 text-white/65" },
};

const STATUS_FILTERS = [
  { id: "ALL", label: "전체" },
  { id: "READY", label: "배송준비" },
  { id: "SHIPPING", label: "배송중" },
  { id: "DELIVERED", label: "배송완료" },
  { id: "ISSUE", label: "배송이슈" },
];

function isGroupMemberProfile(profile) {
  if (!profile) return false;
  return profile.groupId != null && profile.id != null && profile.id !== profile.groupId;
}

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

function normalizeOrders(payload) {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item) => ({
      orderId: item.orderId,
      orderNo: item.orderNo,
      orderName: item.orderName,
      orderedAt: item.orderedAt,
      deliveryId: item.deliveryId,
      deliveryStatus: item.deliveryStatus || "UNKNOWN",
      courierCode: item.courierCode || "",
      trackingNumber: item.trackingNumber || "",
    }))
    .filter((order) => order.deliveryId != null);
}

function deliveryMeta(status) {
  return DELIVERY_STATUS_META[status] || DELIVERY_STATUS_META.UNKNOWN;
}

export default function ArtistShippingPage() {
  const searchParams = useSearchParams();
  const focusDeliveryId = searchParams.get("deliveryId");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isGroupMember, setIsGroupMember] = useState(false);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [submittingOrderId, setSubmittingOrderId] = useState(null);
  const [form, setForm] = useState({ courier: "04", number: "" });

  useEffect(() => {
    let mounted = true;

    request("/api/user/profile")
      .then((profile) => {
        if (!mounted) return null;

        const groupedArtist = isGroupMemberProfile(profile);
        setIsGroupMember(groupedArtist);

        if (groupedArtist) {
          setOrders([]);
          return null;
        }

        return getArtistConsoleOrders();
      })
      .then((data) => {
        if (!mounted || data == null) return;
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

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter((order) => order.deliveryStatus === statusFilter);
  }, [orders, statusFilter]);

  useEffect(() => {
    if (!focusDeliveryId || orders.length === 0) return;

    const target = orders.find(
      (order) => String(order.deliveryId) === String(focusDeliveryId)
    );

    if (!target || target.deliveryStatus !== "READY") return;

    setEditingOrderId(target.orderId);
    setForm({
      courier: target.courierCode || "04",
      number: target.trackingNumber || "",
    });
  }, [focusDeliveryId, orders]);

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
      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        <p className="text-sm text-white/65">배송 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (isGroupMember) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-6">
        <SectionTitle className="text-2xl font-bold">배송 관리</SectionTitle>
        <Surface variant="primary" className="p-8 border border-white/[0.08]">
          <p className="text-sm text-white/80 font-semibold">그룹 소속 아티스트 계정은 주문/배송 관리 기능을 사용할 수 없습니다.</p>
          <p className="text-xs text-white/55 mt-2">해당 업무는 그룹 계정에서 관리해 주세요.</p>
        </Surface>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8">
      <header className="space-y-1">
        <SectionTitle className="text-2xl font-bold">배송 관리</SectionTitle>
        <p className="text-sm text-white/55 font-medium">배송이 필요한 주문의 상태를 확인하고 송장을 등록합니다.</p>
      </header>

      {loadError && (
        <Surface variant="primary" className="p-5 border border-rose-400/35">
          <p className="text-xs text-rose-300 font-semibold">{loadError}</p>
        </Surface>
      )}

      <Surface variant="primary" className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === item.id
                    ? "bg-violet-500/30 text-violet-200 border border-violet-400/40"
                    : "bg-white/[0.04] text-white/70 border border-white/[0.08] hover:bg-white/[0.08]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-white/65">배송 대상 {orders.length}건</div>
        </div>
      </Surface>

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">주문번호 / 일자</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상품명</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상태</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">배송정보</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-sm text-white/55 text-center">
                  조건에 맞는 배송 주문이 없습니다.
                </td>
              </tr>
            )}

            {filteredOrders.map((order) => {
              const isEditing = editingOrderId === order.orderId;
              const isSubmitting = submittingOrderId === order.orderId;
              const meta = deliveryMeta(order.deliveryStatus);
              const canEditTracking = order.deliveryStatus === "READY";

              return (
                <tr
                  key={order.orderId}
                  className={`border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors ${
                    focusDeliveryId && String(order.deliveryId) === String(focusDeliveryId)
                      ? "bg-violet-500/10"
                      : ""
                  }`}
                >
                  <td className="px-6 py-5">
                    <p className="font-bold text-white">#{order.orderNo}</p>
                    <p className="text-[10px] text-white/55">{formatDate(order.orderedAt)}</p>
                  </td>

                  <td className="px-6 py-5 font-medium text-white/80">{order.orderName}</td>

                  <td className="px-6 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center whitespace-nowrap leading-none px-3 py-1.5 rounded-full text-[11px] font-bold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </td>

                  <td className="px-6 py-5">
                    {order.trackingNumber ? (
                      <div className="text-[11px] text-white/75 space-y-1">
                        <p>택배사: {order.courierCode || "-"}</p>
                        <p>운송장: {order.trackingNumber}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-white/50">등록된 운송장 정보가 없습니다.</p>
                    )}
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

                    {!isEditing && !canEditTracking && (
                      <Link
                        href="/artist-console/orders"
                        className="text-[10px] text-white/60 hover:text-white"
                      >
                        주문관리 보기
                      </Link>
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
                            className="w-24 px-2 py-1 text-xs rounded bg-[#201a33] border border-white/10 text-white"
                          />
                          <input
                            value={form.number}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, number: e.target.value }))
                            }
                            placeholder="운송장 번호"
                            className="w-44 px-2 py-1 text-xs rounded bg-[#201a33] border border-white/10 text-white"
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
