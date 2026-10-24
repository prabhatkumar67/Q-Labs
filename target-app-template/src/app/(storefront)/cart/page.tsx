"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  stock_quantity: number;
  image_url: string;
}

const SHIPPING_OPTIONS = [
  { id: "standard", label: "Standard Shipping", time: "5-7 business days", cost: 4.99, freeThreshold: 50 },
  { id: "express", label: "Express Shipping", time: "2-3 business days", cost: 12.99, freeThreshold: null },
  { id: "overnight", label: "Overnight Shipping", time: "1 business day", cost: 24.99, freeThreshold: null },
] as const;

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [updatingQty, setUpdatingQty] = useState<number | null>(null);
  const [shippingMethod, setShippingMethod] = useState<string>("standard");
  const [dynamicShippingEnabled, setDynamicShippingEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));

    fetch("/api/features")
      .then((r) => r.json())
      .then((flags) => setDynamicShippingEnabled(flags.dynamicShipping))
      .catch(() => {});
  }, []);

  async function updateQuantity(itemId: number, newQty: number) {
    setUpdatingQty(itemId);
    if (newQty < 1) {
      await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
      setItems(items.filter((item) => item.id !== itemId));
    } else {
      await fetch(`/api/cart/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, quantity: newQty } : item
        )
      );
    }
    setUpdatingQty(null);
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function removeItem(id: number) {
    await fetch(`/api/cart/${id}`, { method: "DELETE" });
    setItems(items.filter((item) => item.id !== id));
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function checkout() {
    setCheckingOut(true);
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setMessage(`Order #${data.order_id} placed successfully!`);
      setItems([]);
      window.dispatchEvent(new Event("cart-updated"));
    } else {
      setMessage(data.error || "Checkout failed");
    }
    setCheckingOut(false);
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const effectiveMethod = dynamicShippingEnabled ? shippingMethod : "standard";
  const selectedShipping = SHIPPING_OPTIONS.find((s) => s.id === effectiveMethod)!;
  const shippingCost =
    selectedShipping.freeThreshold && subtotal >= selectedShipping.freeThreshold
      ? 0
      : selectedShipping.cost;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#202223]">Shopping Cart</h1>
        <p className="text-sm text-[#6d7175] mt-1">
          {loading ? "Loading..." : `${itemCount} ${itemCount === 1 ? "item" : "items"} in your cart`}
        </p>
      </div>

      {message && (
        <div className="bg-[#f1f8f5] border border-[#008060] rounded-xl p-4 mb-6 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="#008060" className="mt-0.5 shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-[#008060] font-medium text-sm">{message}</p>
            <Link href="/" className="text-[#008060] text-sm underline hover:no-underline mt-1 inline-block">
              Continue shopping
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-[#e1e3e5] p-8 animate-pulse">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-16 h-16 bg-[#f6f6f7] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#f6f6f7] rounded w-1/3" />
                  <div className="h-3 bg-[#f6f6f7] rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 && !message ? (
        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-12 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8c9196" strokeWidth="1.5" className="mx-auto mb-4">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          <h2 className="text-lg font-semibold text-[#202223] mb-1">Your cart is empty</h2>
          <p className="text-[#6d7175] text-sm mb-6">Looks like you haven&apos;t added anything to your cart yet.</p>
          <Link
            href="/"
            className="inline-flex bg-[#008060] text-white px-6 py-2.5 rounded-lg hover:bg-[#006e52] font-medium text-sm transition-colors shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)]"
          >
            Start Shopping
          </Link>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Cart items */}
            <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-5 ${
                    idx < items.length - 1 ? "border-b border-[#edeeef]" : ""
                  } hover:bg-[#fafbfb] transition-colors`}
                >
                  <div className="w-16 h-16 bg-[#f6f6f7] rounded-lg border border-[#e1e3e5] shrink-0 overflow-hidden relative">
                    {item.image_url ? (
                      <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 20 20" fill="#8c9196" className="opacity-40">
                          <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[#202223] text-sm truncate">{item.name}</h3>
                    <p className="text-sm text-[#6d7175] mt-0.5">${item.price.toFixed(2)} each</p>
                  </div>

                  <div className="flex items-center border border-[#e1e3e5] rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={updatingQty === item.id}
                      className="w-8 h-8 flex items-center justify-center text-[#6d7175] hover:bg-[#f6f6f7] hover:text-[#202223] transition-colors disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <input
                      data-testid={`quantity-input-${item.product_id}`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1) {
                          updateQuantity(item.id, val);
                        }
                      }}
                      className="w-10 text-center text-sm text-[#202223] border-x border-[#e1e3e5] py-1 bg-white focus:outline-none"
                      min="1"
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={updatingQty === item.id || item.quantity >= item.stock_quantity}
                      className="w-8 h-8 flex items-center justify-center text-[#6d7175] hover:bg-[#f6f6f7] hover:text-[#202223] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Increase quantity"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <div className="text-right w-20 shrink-0">
                    <span className="font-semibold text-[#202223] text-sm">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <button
                    data-testid={`remove-item-btn-${item.product_id}`}
                    aria-label={`Remove ${item.name} from cart`}
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-[#8c9196] hover:text-[#d72c0d] hover:bg-[#fef3f1] rounded-lg transition-colors shrink-0"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Shipping method selector (feature-flagged) */}
            {dynamicShippingEnabled && (
              <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
                <h2 className="font-semibold text-[#202223] mb-3">Shipping Method</h2>
                <div className="space-y-2">
                  {SHIPPING_OPTIONS.map((option) => {
                    const isFree = option.freeThreshold && subtotal >= option.freeThreshold;
                    return (
                      <label
                        key={option.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          shippingMethod === option.id
                            ? "border-[#008060] bg-[#f1f8f5]"
                            : "border-[#e1e3e5] hover:border-[#8c9196]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          value={option.id}
                          checked={shippingMethod === option.id}
                          onChange={() => setShippingMethod(option.id)}
                          className="accent-[#008060] w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#202223]">{option.label}</span>
                            {isFree && (
                              <span className="text-[10px] font-bold uppercase bg-[#008060] text-white px-1.5 py-0.5 rounded">
                                Free
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6d7175] mt-0.5">{option.time}</p>
                        </div>
                        <span className="text-sm font-medium text-[#202223]">
                          {isFree ? (
                            <span className="flex items-center gap-1.5">
                              <span className="line-through text-[#8c9196]">${option.cost.toFixed(2)}</span>
                              <span className="text-[#008060]">$0.00</span>
                            </span>
                          ) : (
                            `$${option.cost.toFixed(2)}`
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#008060] hover:text-[#006e52] text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 sticky top-24">
              <h2 className="font-semibold text-[#202223] mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#6d7175]">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="text-[#202223]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6d7175]">
                  <span>Shipping ({selectedShipping.label.split(" ")[0]})</span>
                  <span className={shippingCost === 0 ? "text-[#008060] font-medium" : "text-[#202223]"}>
                    {shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-[#6d7175]">
                  <span>Tax</span>
                  <span className="text-[#202223]">${tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-[#e1e3e5] mt-4 pt-4">
                <div className="flex justify-between mb-4">
                  <span className="font-semibold text-[#202223]">Total</span>
                  <span className="text-xl font-bold text-[#202223]">
                    ${total.toFixed(2)}
                  </span>
                </div>

                <button
                  data-testid="checkout-btn"
                  aria-label="Checkout"
                  onClick={checkout}
                  disabled={checkingOut}
                  className="w-full bg-[#008060] text-white py-3 rounded-lg hover:bg-[#006e52] active:bg-[#005e46] font-medium transition-colors shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)] disabled:bg-[#8c9196]"
                >
                  {checkingOut ? "Processing..." : "Checkout"}
                </button>

                {effectiveMethod === "standard" && subtotal < 50 && (
                  <p className="text-xs text-[#6d7175] mt-3 text-center">
                    Add ${(50 - subtotal).toFixed(2)} more for free shipping
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
