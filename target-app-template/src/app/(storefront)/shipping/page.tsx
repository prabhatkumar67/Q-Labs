export default function ShippingPage() {
  const policies = [
    { title: "Standard Shipping", time: "5-7 business days", cost: "$4.99", note: "Free on orders over $50" },
    { title: "Express Shipping", time: "2-3 business days", cost: "$12.99", note: null },
    { title: "Overnight Shipping", time: "1 business day", cost: "$24.99", note: "Order by 2pm EST" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#202223] mb-2">Shipping Information</h1>
      <p className="text-[#6d7175] mb-8">We offer multiple shipping options to get your order to you as quickly as possible.</p>

      <div className="space-y-4 mb-10">
        {policies.map((p) => (
          <div key={p.title} className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#202223]">{p.title}</h3>
              <p className="text-sm text-[#6d7175] mt-0.5">{p.time}</p>
              {p.note && <p className="text-xs text-[#008060] font-medium mt-1">{p.note}</p>}
            </div>
            <span className="text-lg font-bold text-[#202223]">{p.cost}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8">
        <h2 className="text-xl font-semibold text-[#202223] mb-4">Shipping FAQ</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium text-[#202223]">Where do you ship?</h4>
            <p className="text-[#6d7175] mt-1">We currently ship to all 50 US states and select international destinations.</p>
          </div>
          <div>
            <h4 className="font-medium text-[#202223]">How do I track my order?</h4>
            <p className="text-[#6d7175] mt-1">Once your order ships, you&apos;ll receive a tracking number via email.</p>
          </div>
          <div>
            <h4 className="font-medium text-[#202223]">Can I change my shipping address?</h4>
            <p className="text-[#6d7175] mt-1">Contact us within 1 hour of placing your order and we&apos;ll do our best to update it.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
