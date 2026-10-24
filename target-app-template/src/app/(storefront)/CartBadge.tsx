"use client";

import { useEffect, useState } from "react";

export default function CartBadge() {
  const [count, setCount] = useState(0);

  function fetchCount() {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((items: { quantity: number }[]) => {
        const total = items.reduce((sum, item) => sum + item.quantity, 0);
        setCount(total);
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchCount();

    function onCartUpdate() {
      fetchCount();
    }

    window.addEventListener("cart-updated", onCartUpdate);
    return () => window.removeEventListener("cart-updated", onCartUpdate);
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-2 -right-3 bg-[#008060] text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center font-bold px-1">
      {count}
    </span>
  );
}
