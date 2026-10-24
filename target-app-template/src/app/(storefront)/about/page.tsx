export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#202223] mb-6">About Us</h1>
      <div className="prose prose-sm text-[#202223] space-y-4">
        <p className="text-lg text-[#6d7175] leading-relaxed">
          Sandbox Store is your trusted destination for quality products at fair prices. We believe shopping should be simple, enjoyable, and accessible to everyone.
        </p>
        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8 mt-8">
          <h2 className="text-xl font-semibold text-[#202223] mb-4">Our Mission</h2>
          <p className="text-[#6d7175] leading-relaxed">
            We curate a thoughtful selection of products across electronics, apparel, home goods, fitness gear, and more. Every item in our catalog is chosen for its quality, value, and the joy it brings to our customers.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8">
          <h2 className="text-xl font-semibold text-[#202223] mb-4">Our Story</h2>
          <p className="text-[#6d7175] leading-relaxed mb-4">
            Founded in 2024, Sandbox Store started as a small operation with a big dream: make great products accessible to everyone. Today, we serve customers worldwide with a growing catalog and a commitment to exceptional service.
          </p>
          <p className="text-[#6d7175] leading-relaxed">
            Our team works directly with manufacturers and artisans to bring you products that meet our high standards for quality and sustainability.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 text-center">
            <div className="text-2xl font-bold text-[#008060] mb-1">1,000+</div>
            <div className="text-sm text-[#6d7175]">Happy Customers</div>
          </div>
          <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 text-center">
            <div className="text-2xl font-bold text-[#008060] mb-1">50+</div>
            <div className="text-sm text-[#6d7175]">Products</div>
          </div>
          <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6 text-center">
            <div className="text-2xl font-bold text-[#008060] mb-1">4.8/5</div>
            <div className="text-sm text-[#6d7175]">Average Rating</div>
          </div>
        </div>
      </div>
    </div>
  );
}
