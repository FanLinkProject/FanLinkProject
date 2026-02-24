"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SectionTitle from "@/components/ui/SectionTitle";
import Surface from "@/components/ui/Surface";
import { request } from "@/lib/api";
import { getArtistConsoleOrders } from "@/lib/orderApi";

const ORDER_STATUS_META = {
  PENDING: { label: "결제 대기", className: "bg-amber-500/20 text-amber-300" },
  COMPLETED: { label: "결제 완료", className: "bg-emerald-500/20 text-emerald-300" },
  CANCELED: { label: "취소", className: "bg-rose-500/20 text-rose-300" },
  FAILED: { label: "실패", className: "bg-rose-500/20 text-rose-300" },
  UNKNOWN: { label: "상태 미확인", className: "bg-white/10 text-white/65" },
};

const DELIVERY_STATUS_META = {
  READY: { label: "배송준비", className: "bg-violet-500/20 text-violet-300" },
  SHIPPING: { label: "배송중", className: "bg-sky-500/20 text-sky-300" },
  DELIVERED: { label: "배송완료", className: "bg-emerald-500/20 text-emerald-300" },
  ISSUE: { label: "배송이슈", className: "bg-rose-500/20 text-rose-300" },
  UNKNOWN: { label: "상태 미확인", className: "bg-white/10 text-white/65" },
};

const FILTERS = [
  { id: "ALL", label: "전체" },
  { id: "SHIPPING_REQUIRED", label: "배송 필요" },
  { id: "NO_SHIPPING", label: "배송 불필요" },
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

function formatAmount(value) {
  if (value == null || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return `${value}원`;
  return `${amount.toLocaleString()}원`;
}

function normalizeOrders(payload) {
  if (!Array.isArray(payload)) return [];

  return payload.map((item) => {
    const deliveryRequired = item.deliveryId != null;

    return {
      orderId: item.orderId,
      orderNo: item.orderNo,
      orderName: item.orderName,
      totalAmount: item.totalAmount,
      orderStatus: item.orderStatus || "UNKNOWN",
      orderedAt: item.orderedAt,
      deliveryRequired,
      deliveryId: item.deliveryId,
      deliveryStatus: item.deliveryStatus || "UNKNOWN",
    };
  });
}

function orderStatusMeta(status) {
  return ORDER_STATUS_META[status] || ORDER_STATUS_META.UNKNOWN;
}

function deliveryStatusMeta(order) {
  if (!order.deliveryRequired) {
    return { label: "배송 불필요", className: "bg-white/10 text-white/65" };
  }
  return DELIVERY_STATUS_META[order.deliveryStatus] || DELIVERY_STATUS_META.UNKNOWN;
}

export default function ArtistOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [isGroupMember, setIsGroupMember] = useState(false);

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
    if (filter === "SHIPPING_REQUIRED") {
      return orders.filter((order) => order.deliveryRequired);
    }
    if (filter === "NO_SHIPPING") {
      return orders.filter((order) => !order.deliveryRequired);
    }
    return orders;
  }, [orders, filter]);

  const shippingRequiredCount = useMemo(
    () => orders.filter((order) => order.deliveryRequired).length,
    [orders]
  );

  const noShippingCount = orders.length - shippingRequiredCount;

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-7xl mx-auto">
        <p className="text-sm text-white/65">주문 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (isGroupMember) {
    return (
      <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-6">
        <SectionTitle className="text-2xl font-bold">주문 관리</SectionTitle>
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
        <SectionTitle className="text-2xl font-bold">주문 관리</SectionTitle>
        <p className="text-sm text-white/55 font-medium">주문 내역을 확인하고 배송 필요 여부를 구분합니다.</p>
      </header>

      {loadError && (
        <Surface variant="primary" className="p-5 border border-rose-400/35">
          <p className="text-xs text-rose-300 font-semibold">{loadError}</p>
        </Surface>
      )}

      <Surface variant="primary" className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  filter === item.id
                    ? "bg-violet-500/30 text-violet-200 border border-violet-400/40"
                    : "bg-white/[0.04] text-white/70 border border-white/[0.08] hover:bg-white/[0.08]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-white/65 flex gap-4">
            <span>총 {orders.length}건</span>
            <span>배송 필요 {shippingRequiredCount}건</span>
            <span>배송 불필요 {noShippingCount}건</span>
          </div>
        </div>
      </Surface>

      <Surface variant="primary" className="overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04] border-b border-white/[0.06]">
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">주문번호 / 일자</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">상품명</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">결제상태</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">배송유형</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">배송상태</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">금액</th>
              <th className="px-6 py-4 text-[10px] font-black text-white/55 uppercase tracking-widest">관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-sm text-white/55 text-center">
                  조건에 맞는 주문이 없습니다.
                </td>
              </tr>
            )}

            {filteredOrders.map((order) => {
              const orderMeta = orderStatusMeta(order.orderStatus);
              const deliveryMeta = deliveryStatusMeta(order);

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

                  <td className="px-6 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center whitespace-nowrap leading-none px-3 py-1.5 rounded-full text-[11px] font-bold ${orderMeta.className}`}
                    >
                      {orderMeta.label}
                    </span>
                  </td>

                  <td className="px-6 py-5 text-sm text-white/80">
                    {order.deliveryRequired ? "배송 필요" : "배송 불필요"}
                  </td>

                  <td className="px-6 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center whitespace-nowrap leading-none px-3 py-1.5 rounded-full text-[11px] font-bold ${deliveryMeta.className}`}
                    >
                      {deliveryMeta.label}
                    </span>
                  </td>

                  <td className="px-6 py-5 font-black text-white tabular-nums">{formatAmount(order.totalAmount)}</td>

                  <td className="px-6 py-5">
                    {order.deliveryRequired ? (
                      <Link
                        href={`/artist-console/shipping?deliveryId=${order.deliveryId}`}
                        className="text-[11px] font-black text-violet-300 uppercase tracking-widest hover:underline"
                      >
                        배송관리 이동
                      </Link>
                    ) : (
                      <span className="text-[10px] text-white/55">배송 입력 없음</span>
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
