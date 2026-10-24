export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#202223] mb-2">Terms of Service</h1>
      <p className="text-sm text-[#6d7175] mb-8">Last updated: March 1, 2026</p>

      <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8 space-y-6 text-sm text-[#6d7175] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">1. General Terms</h2>
          <p>By accessing and using Sandbox Store, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website. We reserve the right to update these terms at any time.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">2. Products &amp; Pricing</h2>
          <p>All product descriptions, images, and pricing are as accurate as possible but are not guaranteed to be error-free. We reserve the right to correct any errors and to change or update information at any time without prior notice. Prices are listed in USD and are subject to change.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">3. Orders &amp; Payment</h2>
          <p>By placing an order, you represent that the products ordered will be used only in a lawful manner. We reserve the right to refuse or cancel any order for any reason, including product availability, errors in product or pricing information, or suspected fraud.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">4. Shipping &amp; Delivery</h2>
          <p>Shipping times are estimates and are not guaranteed. Sandbox Store is not responsible for delays caused by shipping carriers, customs, weather, or other factors outside our control.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">5. Returns &amp; Refunds</h2>
          <p>Our return policy allows returns within 30 days of delivery. Items must be unused and in original packaging. Refunds are processed within 5-7 business days after we receive the returned item. Shipping costs for returns are the responsibility of the customer unless the return is due to our error.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">6. Limitation of Liability</h2>
          <p>Sandbox Store shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount you paid for the product in question.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#202223] mb-2">7. Contact</h2>
          <p>Questions about these Terms? Contact us at <span className="text-[#202223] font-medium">legal@sandboxstore.com</span>.</p>
        </section>
      </div>
    </div>
  );
}
