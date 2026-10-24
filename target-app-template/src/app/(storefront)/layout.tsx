import Link from "next/link";
import CartBadge from "./CartBadge";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Top announcement bar */}
      <div className="bg-[#1a1c1d] text-white text-center text-sm py-2 px-4">
        Free shipping on orders over $50 &mdash;{" "}
        <Link href="/#products" className="underline hover:no-underline">Shop now</Link>
      </div>

      {/* Main navigation */}
      <nav className="bg-white border-b border-[#e1e3e5] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <span className="font-bold text-xl text-[#202223]">Sandbox Store</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-[#6d7175] hover:text-[#202223] transition-colors font-medium">
                Shop All
              </Link>
              <Link href="/#categories" className="text-[#6d7175] hover:text-[#202223] transition-colors font-medium">
                Categories
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/cart"
              data-testid="nav-cart"
              className="relative flex items-center gap-2 text-[#6d7175] hover:text-[#202223] transition-colors font-medium"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              <CartBadge />
            </Link>
          </div>
        </div>
      </nav>

      <main className="min-h-screen">{children}</main>

      {/* Footer */}
      <footer className="bg-[#1a1c1d] text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Sandbox Store</h3>
              <p className="text-[#a6acb2] text-sm leading-relaxed">
                Your go-to destination for quality products at great prices. Fast shipping and excellent customer service.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Shop</h4>
              <ul className="space-y-2 text-sm text-[#a6acb2]">
                <li><Link href="/" className="hover:text-white transition-colors">All Products</Link></li>
                <li><Link href="/#categories" className="hover:text-white transition-colors">Categories</Link></li>
                <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
                <li><Link href="/returns" className="hover:text-white transition-colors">Returns</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Support</h4>
              <ul className="space-y-2 text-sm text-[#a6acb2]">
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-2 text-sm text-[#a6acb2]">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#333] mt-8 pt-8 text-center text-sm text-[#a6acb2]">
            &copy; 2026 Sandbox Store. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
