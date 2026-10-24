"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  name: string;
  image_url: string;
}

interface Order {
  id: number;
  buyer_name: string;
  total: number;
  status: string;
  created_at: string;
}

interface OrderDetail extends Order {
  items: OrderItem[];
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    delivered: "bg-[#f1f8f5] text-[#008060] border-[#b5dead]",
    shipped: "bg-[#eef9fb] text-[#00788c] border-[#a4e8f2]",
    pending: "bg-[#fdf8e8] text-[#b98900] border-[#e8d48a]",
  };
  return styles[status] || styles.pending;
}

const STATUSES = ["pending", "shipped", "delivered"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  // Order detail panel
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  function fetchOrders() {
    fetch("/api/admin/orders")
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }

  async function openOrderDetail(order: Order) {
    setLoadingDetail(true);
    setSelectedOrder({ ...order, items: [] });
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`);
      const data = await res.json();
      setSelectedOrder(data);
    } catch {
      setSelectedOrder({ ...order, items: [] });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function updateStatus(orderId: number, newStatus: string) {
    setUpdatingStatus(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    // Update local state
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    setUpdatingStatus(false);
  }

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="h-8 w-32 bg-[#e1e3e5] rounded animate-pulse mb-6" />
        <div className="bg-white rounded-xl border border-[#e1e3e5] h-96 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#202223]">Orders</h1>
        <p className="text-sm text-[#6d7175] mt-1">{orders.length} total orders</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-[#e1e3e5] rounded-lg p-1 w-fit">
        {(["all", "pending", "shipped", "delivered"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === tab
                ? "bg-white text-[#202223] shadow-sm"
                : "text-[#6d7175] hover:text-[#202223]"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 text-xs text-[#8c9196]">{counts[tab]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Orders table */}
        <div className={`${selectedOrder ? "flex-1" : "w-full"} transition-all`}>
          <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            <table data-testid="orders-table" className="w-full">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#e1e3e5]">
                  <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Order</th>
                  <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Date</th>
                  <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Customer</th>
                  <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Total</th>
                  <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#6d7175] text-sm">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => openOrderDetail(o)}
                      className={`border-b border-[#edeeef] last:border-b-0 hover:bg-[#fafbfb] transition-colors cursor-pointer ${
                        selectedOrder?.id === o.id ? "bg-[#f1f8f5]" : ""
                      }`}
                    >
                      <td className="py-3 px-5">
                        <span className="text-sm font-medium text-[#008060]">#{o.id}</span>
                      </td>
                      <td className="py-3 px-5 text-sm text-[#6d7175]">{o.created_at}</td>
                      <td className="py-3 px-5 text-sm text-[#202223]">{o.buyer_name}</td>
                      <td className="py-3 px-5 text-sm font-medium text-[#202223]">${o.total.toFixed(2)}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(o.status)}`}>
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order detail panel */}
        {selectedOrder && (
          <div className="w-96 shrink-0">
            <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] sticky top-6">
              <div className="px-5 py-4 border-b border-[#e1e3e5] flex items-center justify-between">
                <h2 className="font-semibold text-[#202223]">Order #{selectedOrder.id}</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 text-[#6d7175] hover:text-[#202223] transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Order info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6d7175]">Customer</span>
                    <span className="text-[#202223] font-medium">{selectedOrder.buyer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6d7175]">Date</span>
                    <span className="text-[#202223]">{selectedOrder.created_at}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6d7175]">Total</span>
                    <span className="text-[#202223] font-bold">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Status update */}
                <div>
                  <label className="block text-sm font-medium text-[#202223] mb-1.5">Status</label>
                  <div className="flex gap-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedOrder.id, s)}
                        disabled={updatingStatus || selectedOrder.status === s}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          selectedOrder.status === s
                            ? `${statusBadge(s)} cursor-default`
                            : "border-[#e1e3e5] text-[#6d7175] hover:border-[#008060] hover:text-[#008060]"
                        } disabled:opacity-60`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order items */}
                <div>
                  <h3 className="text-sm font-medium text-[#202223] mb-2">Items</h3>
                  {loadingDetail ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-12 bg-[#f6f6f7] rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : selectedOrder.items.length === 0 ? (
                    <p className="text-sm text-[#6d7175]">No items data available</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#fafbfb]">
                          <div className="w-8 h-8 bg-[#f6f6f7] rounded border border-[#e1e3e5] shrink-0 overflow-hidden relative">
                            {item.image_url ? (
                              <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="32px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg width="12" height="12" viewBox="0 0 20 20" fill="#8c9196">
                                  <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#202223] truncate">{item.name}</p>
                            <p className="text-xs text-[#6d7175]">Qty: {item.quantity} x ${item.price.toFixed(2)}</p>
                          </div>
                          <span className="text-xs font-medium text-[#202223]">
                            ${(item.quantity * item.price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
