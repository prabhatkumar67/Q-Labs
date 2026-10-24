export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#202223] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[#6d7175] mb-8">Last updated: March 1, 2026</p>

      <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8 space-y-6 text-sm text-[#6d7175] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">Information We Collect</h2>
          <p>When you visit our store, we automatically collect certain information about your device, including your browser type, IP address, time zone, and some of the cookies installed on your device. We refer to this as &quot;Device Information.&quot;</p>
          <p className="mt-2">When you make a purchase, we collect your name, billing address, shipping address, payment information, email address, and phone number. We refer to this as &quot;Order Information.&quot;</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">How We Use Your Information</h2>
          <p>We use the Order Information to fulfill orders, process payments, arrange shipping, provide invoices and order confirmations, and communicate with you. We use Device Information to help us screen for potential risk and fraud, and to improve our store.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">Sharing Your Information</h2>
          <p>We share your Personal Information with third parties to help us process payments (e.g., payment processors), fulfill orders (e.g., shipping carriers), and improve our services (e.g., analytics providers). We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">Your Rights</h2>
          <p>If you are a resident of certain jurisdictions, you have the right to access the personal information we hold about you, request correction, or request deletion. To exercise these rights, please contact us at privacy@sandboxstore.com.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">Data Retention</h2>
          <p>When you place an order, we retain your Order Information for our records unless you ask us to delete it. Device Information is retained for analytics purposes and automatically purged after 12 months.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">Contact Us</h2>
          <p>For questions about this privacy policy or your personal data, contact us at <span className="text-[#202223] font-medium">privacy@sandboxstore.com</span>.</p>
        </section>
      </div>
    </div>
  );
}
