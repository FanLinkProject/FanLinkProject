"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import { getMypage } from "@/lib/userApi";
import { getDelivery, getDeliveryHistory } from "@/lib/deliveryApi";

const TABS = [
  { id: "CANDY_RECHARGE", label: "\uCEA4\uB514 \uCDA9\uC804" },
  { id: "MEMBERSHIP_USE", label: "\uAD6C\uB3C5 \uC911\uC778 \uC0C1\uD488" },
  { id: "GOODS_BUY", label: "\uC0C1\uD488 \uAD6C\uB9E4" },
];

const ORDER_STATUS_LABEL = {
  PENDING: "\uACB0\uC81C \uB300\uAE30",
  COMPLETED: "\uACB0\uC81C \uC644\uB8CC",
  CANCELED: "\uCDE8\uC18C",
  FAILED: "\uC2E4\uD328",
};

const DELIVERY_STATUS_LABEL = {
  READY: "\uBC30\uC1A1 \uC900\uBE44",
  SHIPPING: "\uBC30\uC1A1 \uC911",
  DELIVERED: "\uBC30\uC1A1 \uC644\uB8CC",
  ISSUE: "\uBC30\uC1A1 \uC774\uC288",
  UNKNOWN: "\uC0C1\uD0DC \uBBF8\uD655\uC778",
};

const POSITIVE_STATUS = new Set([
  "COMPLETED",
  "DELIVERED",
  "\uACB0\uC81C \uC644\uB8CC",
  "\uCDA9\uC804 \uC644\uB8CC",
  "\uAD6C\uB3C5 \uC911",
  "\uAD6C\uB3C5 \uC644\uB8CC",
  "\uBC30\uC1A1 \uC644\uB8CC",
]);

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
}

function formatMoney(value) {
  if (value == null) return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return `${amount.toLocaleString()}\uC6D0`;
}

function toOrderStatusLabel(status) {
  return ORDER_STATUS_LABEL[status] || status || "-";
}

function toDeliveryStatusLabel(status) {
  return DELIVERY_STATUS_LABEL[status] || status || "-";
}

function isCompletedStatus(rawStatus, statusLabel) {
  if (POSITIVE_STATUS.has(rawStatus)) return true;
  if (POSITIVE_STATUS.has(statusLabel)) return true;
  return false;
}

export default function PaymentHistoryPage() {
  const [activeTab, setActiveTab] = useState("GOODS_BUY");
  const [loading, setLoading] = useState(true);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [memberships, setMemberships] = useState([]);

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliveryDetail, setDeliveryDetail] = useState(null);
  const [deliveryHistory, setDeliveryHistory] = useState([]);

  useEffect(() => {
    getMypage()
      .then((data) => {
        setPurchaseHistory(Array.isArray(data?.purchaseHistory) ? data.purchaseHistory : []);
        setMemberships(Array.isArray(data?.memberships) ? data.memberships : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const candyRechargeList = [];

  const membershipList = useMemo(
    () =>
      memberships.map((m) => {
        const candyPrice = m.candyPrice ?? m.candy_price;
        const price = m.price;
        const amount =
          candyPrice != null
            ? `${Number(candyPrice).toLocaleString()} \uCEA4\uB514`
            : price != null && price > 0
              ? `${Number(price).toLocaleString()}\uC6D0`
              : "\uD574\uB2F9 \uC5C6\uC74C";

        return {
          id: `SUB-${m.subscriptionId}`,
          date: formatDate(m.endDate ?? m.createdAt),
          name: m.productName,
          amount,
          status: m.isActive ? "\uAD6C\uB3C5 \uC911" : "\uB9CC\uB8CC",
          rawStatus: m.isActive ? "ACTIVE" : "EXPIRED",
          nextPaymentDate: m.nextPaymentDate ?? m.next_payment_date ?? null,
        };
      }),
    [memberships]
  );

  const goodsList = useMemo(
    () =>
      purchaseHistory.map((o) => ({
        id: o.orderNo,
        date: formatDate(o.createdAt),
        name: o.orderName,
        amount: formatMoney(o.totalAmount),
        status: toOrderStatusLabel(o.status),
        rawStatus: o.status,
        deliveryId: o.deliveryId ?? null,
      })),
    [purchaseHistory]
  );

  const historyData = {
    CANDY_RECHARGE: candyRechargeList,
    MEMBERSHIP_USE: membershipList,
    GOODS_BUY: goodsList,
  };

  const currentHistory = historyData[activeTab] || [];

  const closeDeliveryModal = () => {
    setDeliveryModalOpen(false);
    setSelectedOrder(null);
    setDeliveryLoading(false);
    setDeliveryError("");
    setDeliveryDetail(null);
    setDeliveryHistory([]);
  };

  const openDeliveryModal = async (item) => {
    if (!item?.deliveryId) return;

    setSelectedOrder(item);
    setDeliveryModalOpen(true);
    setDeliveryLoading(true);
    setDeliveryError("");
    setDeliveryDetail(null);
    setDeliveryHistory([]);

    try {
      const [detail, history] = await Promise.all([
        getDelivery(item.deliveryId),
        getDeliveryHistory(item.deliveryId),
      ]);
      setDeliveryDetail(detail ?? null);
      setDeliveryHistory(Array.isArray(history) ? history : []);
    } catch (error) {
      setDeliveryError(
        error?.data?.message || error?.message || "\uBC30\uC1A1 \uC870\uD68C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."
      );
    } finally {
      setDeliveryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 lg:p-12 max-w-4xl mx-auto flex items-center justify-center min-h-[30vh]">
        <p className="text-white/55 font-medium">{"\uB85C\uB529 \uC911..."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
          <SectionTitle className="text-2xl font-bold">{"\uB0B4\uC5ED \uAD00\uB9AC"}</SectionTitle>
          <Link
            href="/mypage"
            className="size-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.1] transition-all"
          >
            <span className="material-symbols-outlined">close</span>
          </Link>
        </header>

        <div className="flex gap-2 p-1 bg-white/[0.04] rounded-2xl w-fit flex-wrap border border-white/[0.06]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-[#201a33] text-violet-300 border border-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                  : "text-white/55 hover:text-white/80 border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {currentHistory.map((item) => (
            <Surface
              key={item.id}
              variant="primary"
              className="p-8 flex flex-col md:flex-row justify-between md:items-center gap-6"
            >
              <div className="space-y-2">
                {activeTab !== "MEMBERSHIP_USE" && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-black text-white/45 uppercase tracking-[0.2em]">
                      {item.date}
                    </span>
                    <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest">
                      #{item.id}
                    </span>
                  </div>
                )}
                <h4 className="text-lg font-bold text-white">{item.name}</h4>
                <p className={activeTab === "MEMBERSHIP_USE" ? "text-sm font-bold text-violet-300" : "font-black text-xl text-white/90"}>
                  {item.amount}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    POSITIVE_STATUS.has(item.status) || POSITIVE_STATUS.has(item.rawStatus)
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-violet-500/20 text-violet-300"
                  }`}
                >
                  {item.status}
                </span>

                {activeTab === "GOODS_BUY" && item.deliveryId && isCompletedStatus(item.rawStatus, item.status) && (
                  <button
                    type="button"
                    onClick={() => openDeliveryModal(item)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-violet-200 bg-violet-500/25 border border-violet-400/40 hover:bg-violet-500/35 transition-colors"
                  >
                    {"\uBC30\uC1A1\uC870\uD68C"}
                  </button>
                )}

                {activeTab === "MEMBERSHIP_USE" && item.nextPaymentDate && (
                  <p className="text-xs text-white/55 font-medium">
                    {"\uB2E4\uC74C \uACB0\uC81C\uC77C"}: {formatDate(item.nextPaymentDate)}
                  </p>
                )}
              </div>
            </Surface>
          ))}

          {currentHistory.length === 0 && (
            <Surface variant="primary" className="py-20 text-center">
              <p className="text-white/55 italic">
                {activeTab === "CANDY_RECHARGE"
                  ? "\uCEA4\uB514 \uCDA9\uC804 \uB0B4\uC5ED\uC740 \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4."
                  : "\uB0B4\uC5ED\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."}
              </p>
            </Surface>
          )}
        </div>
      </div>

      {deliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" aria-hidden onClick={closeDeliveryModal} />
          <Surface variant="primary" className="relative w-full max-w-3xl p-8 max-h-[85vh] overflow-y-auto border border-violet-400/25">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {"\uBC30\uC1A1 \uC0C1\uC138 \uB0B4\uC5ED"}
                {selectedOrder?.id ? ` (#${selectedOrder.id})` : ""}
              </h3>
              <button
                type="button"
                className="text-xs text-white/55 hover:text-white"
                onClick={closeDeliveryModal}
              >
                {"\uB2EB\uAE30"}
              </button>
            </div>

            {deliveryLoading && <p className="text-white/70 text-sm">{"\uBC30\uC1A1 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4..."}</p>}

            {!deliveryLoading && deliveryError && (
              <p className="text-rose-300 text-sm font-medium">{deliveryError}</p>
            )}

            {!deliveryLoading && !deliveryError && deliveryDetail && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <p className="text-white/75">
                    {"\uC218\uB839\uC778"}: <span className="text-white font-semibold">{deliveryDetail.recipientName || "-"}</span>
                  </p>
                  <p className="text-white/75">
                    {"\uD0DD\uBC30\uC0AC"}: <span className="text-white font-semibold">{deliveryDetail.courierCode || "-"}</span>
                  </p>
                  <p className="text-white/75">
                    {"\uC6B4\uC1A1\uC7A5"}: <span className="text-white font-semibold">{deliveryDetail.trackingNumber || "-"}</span>
                  </p>
                  <p className="text-white/75">
                    {"\uD604\uC7AC \uC0C1\uD0DC"}:{" "}
                    <span className="text-white font-semibold">
                      {toDeliveryStatusLabel(deliveryDetail.status)} ({deliveryDetail.trackingStatus || "-"})
                    </span>
                  </p>
                  <p className="text-white/75 sm:col-span-2">
                    {"\uC8FC\uC18C"}:{" "}
                    <span className="text-white font-semibold">
                      {`${deliveryDetail.address || ""} ${deliveryDetail.detailAddress || ""}`.trim() || "-"}
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white mb-2">{"\uC0C1\uD0DC \uBCC0\uACBD \uC774\uB825"}</p>
                  {deliveryHistory.length === 0 ? (
                    <p className="text-xs text-white/50">{"\uC544\uC9C1 \uAE30\uB85D\uB41C \uBCC0\uACBD \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                  ) : (
                    <ul className="space-y-2">
                      {deliveryHistory.map((item, idx) => (
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
        </div>
      )}
    </>
  );
}