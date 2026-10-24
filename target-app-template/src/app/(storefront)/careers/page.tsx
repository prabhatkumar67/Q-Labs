import Link from "next/link";

const openings = [
  { title: "Senior Frontend Engineer", team: "Engineering", location: "Remote (US)", type: "Full-time" },
  { title: "Product Designer", team: "Design", location: "San Francisco, CA", type: "Full-time" },
  { title: "Customer Support Specialist", team: "Support", location: "Remote (US)", type: "Full-time" },
  { title: "Marketing Manager", team: "Marketing", location: "San Francisco, CA", type: "Full-time" },
  { title: "Warehouse Associate", team: "Operations", location: "Oakland, CA", type: "Part-time" },
];

export default function CareersPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-[#202223] mb-2">Careers</h1>
      <p className="text-[#6d7175] mb-8">Join our team and help us build the future of e-commerce.</p>

      <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-8 mb-8">
        <h2 className="text-xl font-semibold text-[#202223] mb-2">Why Sandbox Store?</h2>
        <p className="text-sm text-[#6d7175] leading-relaxed mb-4">
          We&apos;re a fast-growing e-commerce company building products that millions of people use every day. We offer competitive compensation, flexible work arrangements, and a culture that values impact over hours.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["Health & Dental", "401(k) Match", "Unlimited PTO", "Remote-Friendly"].map((perk) => (
            <div key={perk} className="bg-[#f1f8f5] rounded-lg p-3 text-center">
              <span className="text-xs font-medium text-[#008060]">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-xl font-semibold text-[#202223] mb-4">Open Positions</h2>
      <div className="space-y-3">
        {openings.map((job) => (
          <Link key={job.title} href="/contact" className="block bg-white rounded-xl border border-[#e1e3e5] shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#202223] group-hover:text-[#008060] transition-colors">{job.title}</h3>
                <p className="text-sm text-[#6d7175] mt-0.5">{job.team} &middot; {job.location} &middot; {job.type}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="#6d7175" className="shrink-0 group-hover:translate-x-1 transition-transform">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
