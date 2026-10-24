"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  stock_quantity: number;
  price: number;
  category: string;
  image_url: string;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  image_url: string;
  stock_quantity: string;
  category: string;
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  image_url: "",
  stock_quantity: "",
  category: "",
};

function stockBadge(qty: number) {
  if (qty === 0) return "bg-[#fef3f1] text-[#d72c0d] border-[#e8a89a]";
  if (qty <= 10) return "bg-[#fdf8e8] text-[#b98900] border-[#e8d48a]";
  return "bg-[#f1f8f5] text-[#008060] border-[#b5dead]";
}

function stockLabel(qty: number) {
  if (qty === 0) return "Out of stock";
  if (qty <= 10) return "Low stock";
  return "In stock";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  function fetchProducts() {
    fetch("/api/admin/inventory")
      .then((r) => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  function openAddModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: "",
      price: product.price.toString(),
      image_url: product.image_url || "",
      stock_quantity: product.stock_quantity.toString(),
      category: product.category || "",
    });
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price || !form.stock_quantity) {
      setError("Name, price, and stock quantity are required");
      return;
    }

    setSaving(true);
    setError("");

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      image_url: form.image_url.trim(),
      stock_quantity: parseInt(form.stock_quantity),
      category: form.category.trim(),
    };

    if (isNaN(body.price) || body.price < 0) {
      setError("Price must be a valid positive number");
      setSaving(false);
      return;
    }
    if (isNaN(body.stock_quantity) || body.stock_quantity < 0) {
      setError("Stock quantity must be a valid non-negative number");
      setSaving(false);
      return;
    }

    try {
      if (editingProduct) {
        const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update product");
          setSaving(false);
          return;
        }
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create product");
          setSaving(false);
          return;
        }
      }

      setShowModal(false);
      fetchProducts();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete product");
        return;
      }
      setDeletingId(null);
      fetchProducts();
    } catch {
      setDeleteError("Something went wrong");
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="h-8 w-32 bg-[#e1e3e5] rounded animate-pulse mb-6" />
        <div className="bg-white rounded-xl border border-[#e1e3e5] h-96 animate-pulse" />
      </div>
    );
  }

  const lowStockCount = products.filter((p) => p.stock_quantity <= 10 && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Products</h1>
          <p className="text-sm text-[#6d7175] mt-1">
            {products.length} products
            {lowStockCount > 0 && (
              <> &middot; <span className="text-[#b98900]">{lowStockCount} low stock</span></>
            )}
            {outOfStockCount > 0 && (
              <> &middot; <span className="text-[#d72c0d]">{outOfStockCount} out of stock</span></>
            )}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-[#008060] text-white px-4 py-2 rounded-lg hover:bg-[#006e52] font-medium text-sm transition-colors shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)]"
        >
          Add product
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 max-w-sm relative">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#8c9196" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2">
            <circle cx="9" cy="9" r="6" />
            <path d="M13.5 13.5L17 17" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#e1e3e5] rounded-lg text-sm text-[#202223] placeholder-[#8c9196] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-[#e1e3e5] rounded-lg px-3 py-2 text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div className="bg-[#fef3f1] border border-[#d72c0d] text-[#d72c0d] text-sm p-3 rounded-lg mb-4 flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError("")} className="ml-2 font-bold">x</button>
        </div>
      )}

      {/* Products table */}
      <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        <table data-testid="inventory-table" className="w-full">
          <thead>
            <tr className="bg-[#fafbfb] border-b border-[#e1e3e5]">
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Product</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Category</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Price</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Stock</th>
              <th className="text-left py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold">Status</th>
              <th className="py-3 px-5 text-xs uppercase tracking-wide text-[#6d7175] font-semibold w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#6d7175] text-sm">
                  No products found
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-[#edeeef] last:border-b-0 hover:bg-[#fafbfb] transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#f6f6f7] rounded-lg border border-[#e1e3e5] shrink-0 overflow-hidden relative">
                        {p.image_url ? (
                          <Image src={p.image_url} alt={p.name} fill className="object-cover" sizes="40px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="#8c9196">
                              <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => openEditModal(p)}
                        className="text-sm font-medium text-[#008060] hover:text-[#006e52] text-left transition-colors"
                      >
                        {p.name}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-sm text-[#6d7175]">{p.category}</td>
                  <td className="py-3 px-5 text-sm text-[#202223]">${p.price.toFixed(2)}</td>
                  <td className="py-3 px-5 text-sm text-[#202223] font-medium">{p.stock_quantity}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${stockBadge(p.stock_quantity)}`}>
                      {stockLabel(p.stock_quantity)}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 text-[#6d7175] hover:text-[#202223] hover:bg-[#f6f6f7] rounded-lg transition-colors"
                        aria-label={`Edit ${p.name}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      {deletingId === p.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="px-2 py-1 text-xs bg-[#d72c0d] text-white rounded font-medium hover:bg-[#bc2200] transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-1 text-xs text-[#6d7175] hover:text-[#202223] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setDeletingId(p.id); setDeleteError(""); }}
                          className="p-1.5 text-[#6d7175] hover:text-[#d72c0d] hover:bg-[#fef3f1] rounded-lg transition-colors"
                          aria-label={`Delete ${p.name}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#e1e3e5] flex items-center justify-between">
              <h2 className="font-semibold text-[#202223] text-lg">
                {editingProduct ? "Edit product" : "Add product"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-[#6d7175] hover:text-[#202223] transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-[#fef3f1] border border-[#d72c0d] text-[#d72c0d] text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
                  placeholder="Product name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors resize-none"
                  placeholder="Product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#202223] mb-1.5">Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6d7175] text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#202223] mb-1.5">Stock quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
                  placeholder="e.g. Electronics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Image URL</label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e1e3e5] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-[#e1e3e5] rounded-lg text-sm font-medium text-[#202223] hover:bg-[#f6f6f7] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#008060] text-white rounded-lg text-sm font-medium hover:bg-[#006e52] transition-colors disabled:bg-[#8c9196] shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)]"
              >
                {saving ? "Saving..." : editingProduct ? "Save changes" : "Add product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
