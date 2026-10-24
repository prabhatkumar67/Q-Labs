"use client";

import { useState } from "react";

const faqs = [
  { q: "How do I place an order?", a: "Browse our products, click \"Add to Cart\" on items you like, then go to your cart and click \"Checkout\" to complete your purchase." },
  { q: "What payment methods do you accept?", a: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay." },
  { q: "How long does shipping take?", a: "Standard shipping takes 5-7 business days. Express shipping (2-3 days) and overnight shipping are also available at checkout." },
  { q: "Is shipping free?", a: "Yes! We offer free standard shipping on all orders over $50. Orders under $50 have a flat $4.99 shipping fee." },
  { q: "Can I cancel or modify my order?", a: "Orders can be modified or cancelled within 1 hour of placement. After that, the order enters fulfillment and cannot be changed." },
  { q: "What is your return policy?", a: "We offer a 30-day return policy. Items must be unused and in original packaging. Contact us at returns@sandboxstore.com to initiate a return." },
  { q: "Do you ship internationally?", a: "Currently we ship to all 50 US states and select international destinations. International shipping rates vary by location." },
  { q: "How do I track my order?", a: "Once your order ships, you'll receive an email with a tracking number. You can use this to track your package on the carrier's website." },
  { q: "Are your products covered by a warranty?", a: "Most electronics come with a 1-year manufacturer warranty. Other products are covered by our 30-day satisfaction guarantee." },
  { q: "How do I contact customer support?", a: "You can reach us via email at support@sandboxstore.com, by phone at 1-800-SANDBOX (Mon-Fri, 9am-5pm EST), or through our contact form." },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#202223] mb-2">Frequently Asked Questions</h1>
      <p className="text-[#6d7175] mb-8">Find answers to common questions about our store, shipping, and policies.</p>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
              <span className="font-medium text-[#202223] text-sm pr-4">{faq.q}</span>
              <svg
                width="20" height="20" viewBox="0 0 20 20" fill="#6d7175"
                className={`shrink-0 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4 text-sm text-[#6d7175] leading-relaxed border-t border-[#edeeef] pt-3">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
