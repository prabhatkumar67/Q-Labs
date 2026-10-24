export default function ReturnsPage() {
  const steps = [
    { num: 1, title: "Initiate Return", desc: "Contact our support team or use the returns form within 30 days of delivery." },
    { num: 2, title: "Ship It Back", desc: "Pack the item in its original packaging and use the prepaid return label we provide." },
    { num: 3, title: "Get Refunded", desc: "Once we receive and inspect the item, your refund will be processed within 5-7 business days." },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#202223] mb-2">Returns &amp; Exchanges</h1>
      <p className="text-[#6d7175] mb-8">Not happy with your purchase? We make returns easy.</p>

      <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8 mb-8">
        <h2 className="text-xl font-semibold text-[#202223] mb-2">Our Policy</h2>
        <p className="text-[#6d7175] text-sm leading-relaxed">
          We accept returns within <span className="font-semibold text-[#202223]">30 days</span> of delivery for a full refund. Items must be unused, in their original packaging, and in the same condition you received them. Sale items and perishable goods are final sale.
        </p>
      </div>

      <h2 className="text-xl font-semibold text-[#202223] mb-4">How It Works</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {steps.map((s) => (
          <div key={s.num} className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
            <div className="w-8 h-8 bg-[#f1f8f5] text-[#008060] rounded-full flex items-center justify-center text-sm font-bold mb-3">{s.num}</div>
            <h3 className="font-semibold text-[#202223] mb-1">{s.title}</h3>
            <p className="text-sm text-[#6d7175]">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#f1f8f5] border border-[#008060] rounded-xl p-6">
        <h3 className="font-semibold text-[#008060] mb-1">Need to start a return?</h3>
        <p className="text-sm text-[#6d7175]">Email us at <span className="font-medium text-[#202223]">returns@sandboxstore.com</span> with your order number and we&apos;ll get you sorted.</p>
      </div>
    </div>
  );
}
