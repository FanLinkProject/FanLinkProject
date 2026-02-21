"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCandyRechargeProducts } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

const CARD_PADDING = "p-6";
const CARD_MIN_HEIGHT = "min-h-[180px]";

/** 충전되는 캔디 수 = 상품 가격 / 100 */
function candyAmount(price) {
  return price ? Math.floor(Number(price) / 100) : 0;
}

function formatPrice(price) {
  return price != null ? `${Number(price).toLocaleString()}원` : "0원";
}

function getIsAdminFromToken() {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("accessToken");
  const pure = token?.replace(/^Bearer\s+/i, "").trim();
  if (!pure) return false;
  try {
    const payload = JSON.parse(atob(pure.split(".")[1]));
    return payload?.role === "ROLE_ADMIN";
  } catch {
    return false;
  }
}

export default function AdminCandyShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(getIsAdminFromToken());
  }, []);

  useEffect(() => {
    getCandyRechargeProducts()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setProducts(arr);
        if (arr.length > 0 && !selectedId) {
          setSelectedId(arr[0].id);
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="size-10 rounded-full border border-white/10 flex items-center justify-center text-white/55 hover:text-violet-300 transition-colors bg-white/5"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <SectionTitle className="text-2xl font-bold">캔디샵</SectionTitle>
            <p className="text-white/55 text-sm font-medium mt-1">
              멤버십 구독 및 유료 서비스 이용에 사용됩니다.
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="primary" href="/admin/candyshop/new" className="shrink-0 px-6 py-3 text-sm uppercase tracking-widest">
            <span className="material-symbols-outlined text-lg mr-1.5 align-middle">add</span>
            상품 등록
          </Button>
        )}
      </header>

      {loading ? (
        <p className="text-white/55">상품 목록을 불러오는 중...</p>
      ) : products.length === 0 ? (
        <Surface variant="primary" className="py-16 text-center space-y-6">
          <p className="text-white/55">캔디 충전 상품이 없습니다.</p>
          {isAdmin && (
            <Button variant="primary" href="/admin/candyshop/new" className="px-6 py-3 text-sm uppercase tracking-widest">
              <span className="material-symbols-outlined text-lg mr-1.5 align-middle">add</span>
              상품 등록
            </Button>
          )}
        </Surface>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {products.map((p) => {
              const isSelected = selectedId === p.id;
              const amount = candyAmount(p.price);
              const isSubscription = p.isSubscription === true;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={[
                    "rounded-2xl border-2 transition-all duration-200 relative overflow-hidden flex flex-col items-center justify-center text-center",
                    CARD_PADDING,
                    CARD_MIN_HEIGHT,
                    isSelected
                      ? "border-violet-500 bg-violet-500/15 shadow-[0_0_14px_rgba(150,100,255,0.2)] ring-2 ring-violet-500/30 ring-inset"
                      : "border-white/[0.06] bg-[#201a33] hover:border-white/[0.1] hover:bg-white/[0.03] hover:shadow-[0_0_10px_rgba(150,100,255,0.1)]",
                  ].join(" ")}
                >
                  <div
                    className={
                      isSelected
                        ? "size-12 rounded-2xl bg-violet-500 flex items-center justify-center text-white mb-5"
                        : "size-12 rounded-2xl bg-white/[0.06] flex items-center justify-center text-white/55 mb-5"
                    }
                  >
                    <span className="material-symbols-outlined text-2xl">token</span>
                  </div>

                  <p
                    className="text-2xl font-black text-white leading-tight tabular-nums mb-1"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {amount.toLocaleString()} 캔디
                  </p>

                  <p
                    className="text-sm font-bold text-white/70 tabular-nums leading-tight mb-1"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatPrice(p.price)}
                  </p>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSubscription ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {isSubscription ? "정기결제" : "단건결제"}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
