"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface LowStockProduct {
  id: number;
  name: string;
  stock_quantity: number;
}

const navItems = [
  {
    label: "Home",
    href: "/admin",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2L3 8v10h5v-6h4v6h5V8l-7-6z" />
      </svg>
    ),
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4zm2 2h4v1H8V6zm0 3h4v1H8V9zm0 3h3v1H8v-1z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);

  const fetchLowStock = useCallback(() => {
    fetch("/api/admin/inventory")
      .then((r) => r.json())
      .then((products: LowStockProduct[]) => {
        setLowStockProducts(
          products.filter((p) => p.stock_quantity <= 10)
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchQuery.trim()) {
      // Navigate to the relevant page with search pre-populated
      router.push(`/admin/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="admin-sidebar w-[240px] bg-[#1a1c1d] flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-[#333]">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#008060] rounded-lg flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm truncate">Sandbox Store</span>
          </Link>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2a2c2e] text-white"
                    : "text-[#a6acb2] hover:text-white hover:bg-[#2a2c2e]"
                }`}
              >
                <span className={isActive ? "text-white" : "text-[#8c9196]"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3 border-t border-[#333] space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#a6acb2] hover:text-white hover:bg-[#2a2c2e] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-1a7 7 0 100-14 7 7 0 000 14z" clipRule="evenodd" />
            </svg>
            View Store
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#a6acb2] hover:text-white hover:bg-[#2a2c2e] transition-colors w-full text-left"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h5A1.5 1.5 0 0111 4.5v2a.5.5 0 01-1 0v-2a.5.5 0 00-.5-.5h-5a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h5a.5.5 0 00.5-.5v-2a.5.5 0 011 0v2A1.5 1.5 0 019.5 17h-5A1.5 1.5 0 013 15.5v-11z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M14.854 10.354a.5.5 0 000-.708l-3-3a.5.5 0 10-.708.708L13.293 9.5H7a.5.5 0 000 1h6.293l-2.147 2.146a.5.5 0 00.708.708l3-3z" clipRule="evenodd" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-[#e1e3e5] px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#8c9196" strokeWidth="1.5">
              <circle cx="9" cy="9" r="6" />
              <path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search products... (Enter to search)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="flex-1 bg-[#f6f6f7] border border-[#e1e3e5] rounded-lg px-3 py-1.5 text-sm text-[#202223] placeholder-[#8c9196] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-[#5c5f62] hover:text-[#202223] transition-colors rounded-lg hover:bg-[#f6f6f7]"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
                </svg>
                {lowStockProducts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#d72c0d] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {lowStockProducts.length > 9 ? "9+" : lowStockProducts.length}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-[#e1e3e5] shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#e1e3e5] flex items-center justify-between">
                      <h3 className="font-semibold text-[#202223] text-sm">Notifications</h3>
                      {lowStockProducts.length > 0 && (
                        <span className="text-xs text-[#d72c0d] font-medium">{lowStockProducts.length} alerts</span>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {lowStockProducts.length === 0 ? (
                        <div className="p-6 text-center text-sm text-[#6d7175]">
                          No alerts — all products are well stocked
                        </div>
                      ) : (
                        lowStockProducts.map((p) => (
                          <Link
                            key={p.id}
                            href="/admin/products"
                            onClick={() => setShowNotifications(false)}
                            className="flex items-center gap-3 px-4 py-3 border-b border-[#edeeef] last:border-b-0 hover:bg-[#fafbfb] transition-colors"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              p.stock_quantity === 0 ? "bg-[#fef3f1]" : "bg-[#fdf8e8]"
                            }`}>
                              <svg width="14" height="14" viewBox="0 0 20 20" fill={p.stock_quantity === 0 ? "#d72c0d" : "#b98900"}>
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13H9v2h2v-2zm0-6H9v4h2V7z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#202223] truncate">{p.name}</p>
                              <p className={`text-xs font-medium ${p.stock_quantity === 0 ? "text-[#d72c0d]" : "text-[#b98900]"}`}>
                                {p.stock_quantity === 0 ? "Out of stock" : `Only ${p.stock_quantity} left`}
                              </p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                    {lowStockProducts.length > 0 && (
                      <Link
                        href="/admin/products"
                        onClick={() => setShowNotifications(false)}
                        className="block px-4 py-3 text-center text-sm text-[#008060] font-medium border-t border-[#e1e3e5] hover:bg-[#fafbfb] transition-colors"
                      >
                        View all products
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="w-8 h-8 bg-[#008060] rounded-full flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#f6f6f7] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
