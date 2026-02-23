"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCandyRechargeProducts, createProduct } from "@/lib/productApi";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";

const CARD_PADDING = "p-6";
const CARD_MIN_HEIGHT = "min-h-[180px]";

/** 충전되는 캔디 수 = 상품 가격 / 100 */
function candyAmount(price) {
  return price ? Math.floor(Number(price) / 100) : 0;
}

function formatPrice(price) {
  return price != null ? `${Number(price).toLocaleString()}원` : "0원";
}

export default function AdminCandyshopPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candySpendModalOpen, setCandySpendModalOpen] = useState(false);
  const [candySpendName, setCandySpendName] = useState("");
  const [candySpendAmount, setCandySpendAmount] = useState("");
  const [candySpendIsSubscription, setCandySpendIsSubscription] = useState(false);
  const [candySpendSubmitting, setCandySpendSubmitting] = useState(false);

  const fetchProducts = () => {
    getCandyRechargeProducts()
      .then((list) => setProducts(Array.isArray(list) ? list : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchProducts();
  }, []);

  const rechargeProducts = products.filter((p) => p.paymentMethod === "CASH_ONLY");
  const candySpendProducts = products.filter((p) => p.paymentMethod === "CANDY_ONLY");

  const openCandySpendModal = () => {
    setCandySpendName("");
    setCandySpendAmount("");
    setCandySpendIsSubscription(false);
    setCandySpendModalOpen(true);
  };

  const closeCandySpendModal = () => {
    setCandySpendModalOpen(false);
    setCandySpendName("");
    setCandySpendAmount("");
    setCandySpendIsSubscription(false);
  };

  const handleCandySpendSubmit = async (e) => {
    e.preventDefault();
    const name = candySpendName.trim();
    const amount = Number(candySpendAmount);
    if (!name) {
      alert("상품명을 입력하세요.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      alert("필요 캔디 개수를 1 이상 입력하세요.");
      return;
    }
    setCandySpendSubmitting(true);
    try {
      await createProduct({
        artistId: null,
        name,
        price: 0,
        candyPrice: amount,
        type: "CANDY",
        paymentMethod: "CANDY_ONLY",
        isSubscription: candySpendIsSubscription,
        quantity: 0,
        isMembershipOnly: false,
        isExclusive: false,
        isMembership: false,
        concertId: null,
        mediaAssetIds: [],
        representativeMediaAssetId: null,
      });
      fetchProducts();
      closeCandySpendModal();
    } catch (err) {
      alert(err?.message || "등록 실패");
    } finally {
      setCandySpendSubmitting(false);
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-4xl mx-auto space-y-12">
      <header className="flex items-center justify-between gap-4">
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
              캔디 충전 상품 · 캔디 결제 상품
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          className="text-xs uppercase tracking-widest"
          onClick={() => router.push("/admin/candyshop/new")}
        >
          충전 상품 등록
        </Button>
      </header>

      {/* 캔디 충전 상품 */}
      <section>
        <SectionTitle className="text-lg font-bold mb-4">캔디 충전 상품</SectionTitle>
        {loading ? (
          <p className="text-white/55">상품 목록을 불러오는 중...</p>
        ) : rechargeProducts.length === 0 ? (
          <Surface variant="primary" className="py-12 text-center">
            <p className="text-white/55 mb-4">캔디 충전 상품이 없습니다.</p>
            <Button variant="primary" onClick={() => router.push("/admin/candyshop/new")}>
              상품 등록
            </Button>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {rechargeProducts.map((p) => {
              const amount = candyAmount(p.price);
              const isSubscription = p.isSubscription === true;
              return (
                <Surface
                  key={p.id}
                  variant="primary"
                  className={[CARD_PADDING, CARD_MIN_HEIGHT, "flex flex-col items-center justify-center text-center"].join(" ")}
                >
                  <div className="size-12 rounded-2xl bg-white/[0.06] flex items-center justify-center text-white/55 mb-5">
                    <span className="material-symbols-outlined text-2xl">token</span>
                  </div>
                  <p className="text-2xl font-black text-white leading-tight tabular-nums mb-1">
                    {amount.toLocaleString()} 캔디
                  </p>
                  <p className="text-sm font-bold text-white/70 tabular-nums leading-tight mb-1">
                    {formatPrice(p.price)}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSubscription ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/70"
                    }`}
                  >
                    {isSubscription ? "정기결제" : "단건결제"}
                  </span>
                  <p className="text-xs text-white/50 mt-2 truncate w-full">{p.name}</p>
                </Surface>
              );
            })}
          </div>
        )}
      </section>

      {/* 캔디로 결제할 수 있는 상품 (관리자 등록, 캔디 소모) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle className="text-lg font-bold">캔디로 결제할 수 있는 상품</SectionTitle>
          <Button
            variant="primary"
            className="text-xs uppercase tracking-widest"
            onClick={openCandySpendModal}
          >
            상품 등록
          </Button>
        </div>
        {loading ? (
          <p className="text-white/55">로딩 중...</p>
        ) : candySpendProducts.length === 0 ? (
          <Surface variant="primary" className="py-12 text-center">
            <p className="text-white/55">등록된 캔디 결제 상품이 없습니다.</p>
            <p className="text-white/45 text-sm mt-1">상품 등록 버튼으로 추가하세요.</p>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {candySpendProducts.map((p) => (
              <Surface
                key={p.id}
                variant="primary"
                className={[CARD_PADDING, CARD_MIN_HEIGHT, "flex flex-col items-center justify-center text-center"].join(" ")}
              >
                <div className="size-12 rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-300 mb-5">
                  <span className="material-symbols-outlined text-2xl">redeem</span>
                </div>
                <p className="text-sm font-bold text-white/80 truncate w-full mb-1">{p.name}</p>
                <p className="text-xl font-black text-violet-300 tabular-nums">
                  {Number(p.candyPrice || 0).toLocaleString()} 캔디
                </p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${
                    p.isSubscription ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/70"
                  }`}
                >
                  {p.isSubscription ? "구독 (매월 차감)" : "단건"}
                </span>
              </Surface>
            ))}
          </div>
        )}
      </section>

      {/* 캔디 결제 상품 등록 모달 */}
      {candySpendModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={closeCandySpendModal}
        >
          <div
            className="bg-[#1a1525] border border-white/10 rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">캔디 결제 상품 등록</h3>
            <p className="text-sm text-white/60 mb-4">
              관리자 등록 · 캔디로 구매할 수 있는 상품입니다.
            </p>
            <form onSubmit={handleCandySpendSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">상품명</label>
                <input
                  type="text"
                  value={candySpendName}
                  onChange={(e) => setCandySpendName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#201a33] border border-white/[0.06] rounded-xl text-white"
                  placeholder="예: 프리미엄 스티커 팩"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-white/80 mb-2">필요 캔디 개수</label>
                <input
                  type="number"
                  min={1}
                  value={candySpendAmount}
                  onChange={(e) => setCandySpendAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#201a33] border border-white/[0.06] rounded-xl text-white tabular-nums"
                  placeholder="1 이상"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-white/80 mb-1">구독 상품</label>
                  <p className="text-xs text-white/50">ON 시 매월 해당 캔디가 자동 차감됩니다. 부족 시 갱신되지 않습니다.</p>
                </div>
                <Toggle checked={candySpendIsSubscription} onChange={setCandySpendIsSubscription} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={closeCandySpendModal}>
                  취소
                </Button>
                <Button type="submit" variant="primary" disabled={candySpendSubmitting}>
                  {candySpendSubmitting ? "등록 중..." : "등록"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
