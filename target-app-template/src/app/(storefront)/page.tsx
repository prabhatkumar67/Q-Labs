"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
  category: string;
}

const TEST_PRODUCTS: Product[] = [
  // Electronics
  { id: 1, name: "Wireless Bluetooth Earbuds", description: "Premium sound quality with active noise cancellation. 8-hour battery life with charging case.", price: 79.99, image_url: "https://picsum.photos/seed/earbuds/400/400", stock_quantity: 12, category: "Electronics" },
  { id: 2, name: "USB-C Hub Adapter (7-in-1)", description: "Multi-port adapter with HDMI 4K, USB 3.0, SD card reader, and 100W power delivery.", price: 45.99, image_url: "https://picsum.photos/seed/usbhub/400/400", stock_quantity: 3, category: "Electronics" },
  { id: 3, name: "Portable Bluetooth Speaker", description: "Waterproof IPX7 speaker with 360-degree sound. 20-hour playtime, built-in microphone.", price: 59.99, image_url: "https://picsum.photos/seed/speaker/400/400", stock_quantity: 34, category: "Electronics" },
  { id: 4, name: "Wireless Charging Pad", description: "Fast 15W Qi wireless charger compatible with all Qi-enabled devices. LED indicator, slim design.", price: 24.99, image_url: "https://picsum.photos/seed/charger/400/400", stock_quantity: 78, category: "Electronics" },
  { id: 5, name: "Noise-Cancelling Headphones", description: "Over-ear headphones with hybrid ANC, 30-hour battery, and premium memory foam cushions.", price: 149.99, image_url: "https://picsum.photos/seed/headphones/400/400", stock_quantity: 8, category: "Electronics" },

  // Apparel
  { id: 6, name: "Classic Cotton T-Shirt", description: "Soft, breathable cotton tee perfect for everyday wear. Pre-shrunk fabric with reinforced stitching.", price: 24.99, image_url: "https://picsum.photos/seed/tshirt/400/400", stock_quantity: 45, category: "Apparel" },
  { id: 7, name: "Slim Fit Denim Jeans", description: "Premium stretch denim with a modern slim fit. Comfortable waistband, classic 5-pocket design.", price: 64.99, image_url: "https://picsum.photos/seed/jeans/400/400", stock_quantity: 22, category: "Apparel" },
  { id: 8, name: "Lightweight Running Jacket", description: "Water-resistant windbreaker with reflective details. Packable design fits in its own pocket.", price: 89.99, image_url: "https://picsum.photos/seed/jacket/400/400", stock_quantity: 0, category: "Apparel" },
  { id: 9, name: "Merino Wool Beanie", description: "Ultra-soft 100% merino wool beanie. Naturally temperature-regulating, itch-free, and breathable.", price: 29.99, image_url: "https://picsum.photos/seed/beanie/400/400", stock_quantity: 56, category: "Apparel" },

  // Home & Kitchen
  { id: 10, name: "Stainless Steel Water Bottle", description: "Double-wall vacuum insulated. Keeps drinks cold 24hrs or hot 12hrs. BPA-free, 750ml capacity.", price: 28.00, image_url: "https://picsum.photos/seed/bottle/400/400", stock_quantity: 88, category: "Home & Kitchen" },
  { id: 11, name: "Scented Soy Candle Set", description: "Set of 3 hand-poured soy candles. Lavender, vanilla, and eucalyptus scents. 40hr burn time each.", price: 22.00, image_url: "https://picsum.photos/seed/candles/400/400", stock_quantity: 67, category: "Home & Kitchen" },
  { id: 12, name: "Ceramic Pour-Over Coffee Set", description: "Handcrafted ceramic dripper with borosilicate glass carafe. Includes 50 paper filters.", price: 42.00, image_url: "https://picsum.photos/seed/coffee/400/400", stock_quantity: 19, category: "Home & Kitchen" },
  { id: 13, name: "Bamboo Cutting Board Set", description: "Set of 3 organic bamboo boards in graduated sizes. Juice groove, easy-grip handles.", price: 34.99, image_url: "https://picsum.photos/seed/cuttingboard/400/400", stock_quantity: 41, category: "Home & Kitchen" },

  // Sports & Fitness
  { id: 14, name: "Yoga Mat (6mm)", description: "Non-slip exercise mat with alignment lines. Eco-friendly TPE material, includes carry strap.", price: 34.99, image_url: "https://picsum.photos/seed/yogamat/400/400", stock_quantity: 0, category: "Sports & Fitness" },
  { id: 15, name: "Resistance Band Set (5-Pack)", description: "Latex-free TPE bands in 5 resistance levels. Includes door anchor, handles, and carry bag.", price: 19.99, image_url: "https://picsum.photos/seed/bands/400/400", stock_quantity: 120, category: "Sports & Fitness" },
  { id: 16, name: "Adjustable Dumbbell Set", description: "Space-saving adjustable dumbbells, 5-25 lbs per hand. Quick-change mechanism, rubberized grip.", price: 199.99, image_url: "https://picsum.photos/seed/dumbbells/400/400", stock_quantity: 4, category: "Sports & Fitness" },

  // Food & Beverage
  { id: 17, name: "Organic Green Tea (50 bags)", description: "Hand-picked organic green tea leaves. Rich in antioxidants with a smooth, refreshing taste.", price: 12.50, image_url: "https://picsum.photos/seed/greentea/400/400", stock_quantity: 200, category: "Food & Beverage" },
  { id: 18, name: "Artisan Dark Chocolate Bar", description: "Single-origin 72% cacao dark chocolate. Notes of blackberry and toasted almond. Fair-trade certified.", price: 8.99, image_url: "https://picsum.photos/seed/chocolate/400/400", stock_quantity: 95, category: "Food & Beverage" },

  // Accessories
  { id: 19, name: "Leather Bifold Wallet", description: "Genuine leather wallet with RFID blocking technology. Slim design with 8 card slots.", price: 39.99, image_url: "https://picsum.photos/seed/wallet/400/400", stock_quantity: 5, category: "Accessories" },
  { id: 20, name: "Minimalist Analog Watch", description: "Japanese quartz movement, sapphire crystal glass, genuine leather strap. Water-resistant to 50m.", price: 129.00, image_url: "https://picsum.photos/seed/watch/400/400", stock_quantity: 15, category: "Accessories" },
];

const CATEGORY_ICONS: Record<string, string> = {
  "Electronics": "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  "Apparel": "M16 11V3a1 1 0 00-1-1H9a1 1 0 00-1 1v8M4 15h16M6 11h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z",
  "Home & Kitchen": "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  "Sports & Fitness": "M13 10V3L4 14h7v7l9-11h-7z",
  "Food & Beverage": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  "Accessories": "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [addedToCart, setAddedToCart] = useState<number | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (data.length > 0) {
          setProducts(data);
        } else {
          setProducts(TEST_PRODUCTS);
          setUsingFallback(true);
        }
      })
      .catch(() => {
        setProducts(TEST_PRODUCTS);
        setUsingFallback(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  async function addToCart(productId: number) {
    if (usingFallback) {
      setCartError("Products are in preview mode. Database is not available.");
      setTimeout(() => setCartError(null), 3000);
      return;
    }

    setAddingToCart(productId);
    setCartError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCartError(data.error || "Failed to add to cart");
        setTimeout(() => setCartError(null), 3000);
      } else {
        setAddedToCart(productId);
        setTimeout(() => setAddedToCart(null), 2000);
        window.dispatchEvent(new Event("cart-updated"));
      }
    } catch {
      setCartError("Failed to add to cart. Please try again.");
      setTimeout(() => setCartError(null), 3000);
    } finally {
      setAddingToCart(null);
    }
  }

  return (
    <div>
      {/* Error toast */}
      {cartError && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#fef3f1] border border-[#d72c0d] text-[#d72c0d] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-[fadeIn_0.2s_ease-out]">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {cartError}
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#1a1c1d] via-[#2a2c2e] to-[#1a1c1d] text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <span className="inline-block bg-[#008060] text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              New Collection
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Discover products you&apos;ll love
            </h1>
            <p className="text-lg text-[#a6acb2] mb-8 leading-relaxed">
              Curated selection of quality products at great prices. From electronics to home essentials, find everything you need.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#products"
                className="bg-[#008060] text-white px-6 py-3 rounded-lg hover:bg-[#006e52] font-medium transition-colors shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)]"
              >
                Shop Now
              </a>
              <a
                href="#categories"
                className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 font-medium transition-colors backdrop-blur-sm border border-white/20"
              >
                Browse Categories
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div id="categories" className="bg-white border-b border-[#e1e3e5]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-lg font-semibold text-[#202223] mb-5">Shop by Category</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-[#008060] text-white shadow-sm"
                    : "bg-[#f6f6f7] text-[#6d7175] hover:bg-[#e1e3e5] hover:text-[#202223] border border-[#e1e3e5]"
                }`}
              >
                {cat !== "all" && CATEGORY_ICONS[cat] && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={CATEGORY_ICONS[cat]} />
                  </svg>
                )}
                {cat === "all" ? "All Products" : cat}
                <span className={`text-xs ${selectedCategory === cat ? "text-white/70" : "text-[#8c9196]"}`}>
                  ({cat === "all" ? products.length : products.filter((p) => p.category === cat).length})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div id="products" className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#202223]">
              {selectedCategory === "all" ? "All Products" : selectedCategory}
            </h2>
            <p className="text-sm text-[#6d7175] mt-0.5">{filteredProducts.length} products</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e1e3e5] overflow-hidden animate-pulse">
                <div className="h-52 bg-[#f6f6f7]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[#e1e3e5] rounded w-3/4" />
                  <div className="h-3 bg-[#e1e3e5] rounded w-1/2" />
                  <div className="h-8 bg-[#e1e3e5] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <svg width="48" height="48" viewBox="0 0 20 20" fill="#8c9196" className="mx-auto mb-4">
              <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
            </svg>
            <p data-testid="empty-products" className="text-[#6d7175] text-lg">No products found</p>
            <p className="text-[#8c9196] text-sm mt-1">Try selecting a different category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                data-testid={`product-card-${product.id}`}
                className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all group overflow-hidden"
              >
                {/* Product image */}
                <div className="h-52 bg-[#f6f6f7] relative overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 20 20" fill="#8c9196" className="opacity-40">
                        <path fillRule="evenodd" d="M10 2l6 3.5v9L10 18l-6-3.5v-9L10 2zm0 1.15L5 6.5v7l5 3.35 5-3.35v-7L10 3.15z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {product.stock_quantity === 0 && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <span className="bg-[#202223] text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                        Sold Out
                      </span>
                    </div>
                  )}
                  {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#d72c0d] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        Only {product.stock_quantity} left
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[#6d7175] mb-1">{product.category}</p>
                  <h3 className="font-semibold text-[#202223] mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-[#6d7175] line-clamp-2 mb-3 min-h-[2.5rem]">{product.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-[#202223]">${product.price.toFixed(2)}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        product.stock_quantity > 10
                          ? "bg-[#f1f8f5] text-[#008060]"
                          : product.stock_quantity > 0
                          ? "bg-[#fdf8e8] text-[#b98900]"
                          : "bg-[#fef3f1] text-[#d72c0d]"
                      }`}
                    >
                      {product.stock_quantity > 0
                        ? `${product.stock_quantity} in stock`
                        : "Out of stock"}
                    </span>
                  </div>

                  <button
                    data-testid={`add-to-cart-btn-${product.id}`}
                    aria-label={`Add ${product.name} to cart`}
                    onClick={() => addToCart(product.id)}
                    disabled={product.stock_quantity === 0 || addingToCart === product.id}
                    className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                      addedToCart === product.id
                        ? "bg-[#f1f8f5] text-[#008060] border border-[#008060]"
                        : "bg-[#008060] text-white hover:bg-[#006e52] active:bg-[#005e46] shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)] disabled:bg-[#f6f6f7] disabled:text-[#8c9196] disabled:shadow-none disabled:border disabled:border-[#e1e3e5]"
                    } disabled:cursor-not-allowed`}
                  >
                    {addingToCart === product.id
                      ? "Adding..."
                      : addedToCart === product.id
                      ? "Added to Cart!"
                      : "Add to Cart"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
