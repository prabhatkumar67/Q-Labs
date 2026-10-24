"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  lowStockProducts: number;
  pendingOrders: number;
  deliveredOrders: number;
  topProducts: { name: string; total_sold: number; revenue: number }[];
}

interface Order {
  id: number;
  buyer_name: string;
  total: number;
  status: string;
  created_at: string;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    delivered: "bg-[#f1f8f5] text-[#008060] border-[#b5dead]",
    shipped: "bg-[#eef9fb] text-[#00788c] border-[#a4e8f2]",
    pending: "bg-[#fdf8e8] text-[#b98900] border-[#e8d48a]",
  };
  return styles[status] || styles.pending;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/orders").then((r) => r.json()),
    ])
      .then(([s, o]) => {
        setStats(s);
        setOrders(o);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-[#e1e3e5] rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e1e3e5] p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#202223]">Dashboard</h1>
        <p className="text-sm text-[#6d7175] mt-1">Here&apos;s what&apos;s happening with your store today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#6d7175]">Total Revenue</span>
            <div className="w-9 h-9 bg-[#f1f8f5] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="#008060">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 10.5V14H9v-1.5H7V11h2V9H7V7h2V5.5h2V7h2v2h-2v2h2v1.5h-2z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202223]">${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-[#008060] mt-1 font-medium">All time</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#6d7175]">Total Orders</span>
            <div className="w-9 h-9 bg-[#eef9fb] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="#00788c">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4zm2 2h4v1H8V6zm0 3h4v1H8V9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202223]">{stats.totalOrders}</div>
          <p className="text-xs text-[#6d7175] mt-1">{stats.pendingOrders} pending &middot; {stats.deliveredOrders} delivered</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#6d7175]">Products</span>
            <div className="w-9 h-9 bg-[#fdf8e8] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="#b98900">
                <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202223]">{stats.totalProducts}</div>
          <p className="text-xs text-[#6d7175] mt-1">Active listings</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#6d7175]">Low Stock</span>
            <div className="w-9 h-9 bg-[#fef3f1] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="#d72c0d">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13H9v2h2v-2zm0-6H9v4h2V7z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202223]">{stats.lowStockProducts}</div>
          <p className="text-xs text-[#d72c0d] mt-1 font-medium">
            {stats.lowStockProducts > 0 ? "Needs attention" : "All stocked"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="px-5 py-4 border-b border-[#e1e3e5] flex items-center justify-between">
            <h2 className="font-semibold text-[#202223]">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-[#008060] hover:text-[#006e52] font-medium transition-colors">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#e1e3e5]">
                  <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Order</th>
                  <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Customer</th>
                  <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Total</th>
                  <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="border-b border-[#edeeef] last:border-b-0 hover:bg-[#fafbfb] transition-colors">
                    <td className="py-3 px-5 text-sm font-medium text-[#008060]">#{o.id}</td>
                    <td className="py-3 px-5 text-sm text-[#202223]">{o.buyer_name}</td>
                    <td className="py-3 px-5 text-sm text-[#202223]">${o.total.toFixed(2)}</td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(o.status)}`}>
                        {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="px-5 py-4 border-b border-[#e1e3e5] flex items-center justify-between">
            <h2 className="font-semibold text-[#202223]">Top Products</h2>
            <Link href="/admin/products" className="text-sm text-[#008060] hover:text-[#006e52] font-medium transition-colors">
              View all
            </Link>
          </div>
          <div className="p-5 space-y-4">
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-[#6d7175]">No sales data yet.</p>
            ) : (
              stats.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#f6f6f7] rounded-lg flex items-center justify-center text-xs font-bold text-[#6d7175] shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#202223] truncate">{p.name}</p>
                    <p className="text-xs text-[#6d7175]">{p.total_sold} sold</p>
                  </div>
                  <span className="text-sm font-medium text-[#202223]">
                    ${p.revenue.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
