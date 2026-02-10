"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import Surface from "@/components/ui/Surface";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";

export default function CartPage() {
  const [items, setItems] = useState(
    MOCK_PRODUCTS.slice(0, 2).map((p) => ({ ...p, quantity: 1 }))
  );

  const updateQuantity = (id, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalAmount = items.reduce((acc, item) => {
    const price = parseInt(item.price.replace(/[^0-9]/g, ""), 10);
    return acc + price * item.quantity;
  }, 0);

  return (
    <div className="p-8 lg:p-12 max-w-5xl mx-auto space-y-12">
      <header className="flex items-center justify-between">
        <SectionTitle className="text-2xl font-bold">장바구니</SectionTitle>
        <Link
          href="/market"
          className="text-sm font-bold text-white/55 hover:text-violet-300 transition-colors"
        >
          계속 쇼핑하기
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => (
            <Surface
              key={item.id}
              variant="primary"
              className="p-6 flex gap-6"
            >
              <img
                src={item.image}
                className="size-24 rounded-2xl object-cover border border-white/[0.08]"
                alt=""
              />
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white truncate">{item.name}</h4>
                  <p className="text-xs text-white/55 font-medium uppercase tracking-widest">
                    {item.artistName}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 bg-white/[0.06] rounded-xl p-1 border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="size-8 rounded-lg hover:bg-white/[0.08] transition-colors flex items-center justify-center text-white/80"
                    >
                      <span className="material-symbols-outlined text-lg">remove</span>
                    </button>
                    <span className="text-sm font-black w-6 text-center text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="size-8 rounded-lg hover:bg-white/[0.08] transition-colors flex items-center justify-center text-white/80"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>
                  <p className="font-black text-violet-300">{item.price}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-white/45 hover:text-red-400/90 transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </Surface>
          ))}
          {items.length === 0 && (
            <Surface variant="primary" className="py-20 text-center">
              <p className="text-white/55 italic">장바구니가 비어 있습니다.</p>
            </Surface>
          )}
        </div>

        <div className="lg:col-span-4">
          <Surface variant="primary" className="p-8 sticky top-24">
            <h3 className="font-black text-lg text-white mb-6">주문 요약</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm text-white/55">
                <span>상품 금액</span>
                <span>{totalAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm text-white/55">
                <span>배송비</span>
                <span>3,000원</span>
              </div>
              <div className="h-px bg-white/[0.06]" />
              <div className="flex justify-between font-black text-xl text-violet-300">
                <span>총 결제 금액</span>
                <span>{(totalAmount + 3000).toLocaleString()}원</span>
              </div>
            </div>
            <Button
              href={items.length > 0 ? "/checkout" : "#"}
              variant="primary"
              disabled={items.length === 0}
              className="w-full py-4 text-sm uppercase tracking-widest"
            >
              주문하기
            </Button>
          </Surface>
        </div>
      </div>
    </div>
  );
}
