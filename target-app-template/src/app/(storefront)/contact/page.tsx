"use client";

import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#202223] mb-2">Contact Us</h1>
      <p className="text-[#6d7175] mb-8">Have a question or feedback? We&apos;d love to hear from you.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-[#f1f8f5] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 20 20" fill="#008060">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[#202223] mb-1">Message Sent!</h2>
              <p className="text-sm text-[#6d7175]">We&apos;ll get back to you within 24 hours.</p>
              <button onClick={() => { setSubmitted(false); setForm({ name: "", email: "", message: "" }); }} className="mt-4 text-[#008060] text-sm font-medium hover:text-[#006e52]">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#202223] mb-1.5">Message</label>
                <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2.5 border border-[#e1e3e5] rounded-lg text-sm text-[#202223] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors resize-none" placeholder="How can we help?" />
              </div>
              <button type="submit" className="w-full bg-[#008060] text-white py-2.5 rounded-lg hover:bg-[#006e52] font-medium text-sm transition-colors shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)]">
                Send Message
              </button>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <h3 className="font-semibold text-[#202223] mb-3">Email</h3>
            <p className="text-sm text-[#6d7175]">support@sandboxstore.com</p>
            <p className="text-xs text-[#8c9196] mt-1">We respond within 24 hours</p>
          </div>
          <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <h3 className="font-semibold text-[#202223] mb-3">Phone</h3>
            <p className="text-sm text-[#6d7175]">1-800-SANDBOX</p>
            <p className="text-xs text-[#8c9196] mt-1">Mon-Fri, 9am-5pm EST</p>
          </div>
          <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <h3 className="font-semibold text-[#202223] mb-3">Address</h3>
            <p className="text-sm text-[#6d7175]">123 Commerce Street<br />San Francisco, CA 94105</p>
          </div>
        </div>
      </div>
    </div>
  );
}
