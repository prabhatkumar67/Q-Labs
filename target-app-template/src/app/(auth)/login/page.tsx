"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin");
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#008060] rounded-2xl mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <h1 className="text-[#202223] text-xl font-semibold">Sandbox Store</h1>
          <p className="text-[#6d7175] text-sm mt-1">Supplier Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl border border-[#e1e3e5] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-8">
          <h2 className="text-[#202223] text-lg font-semibold mb-6">Log in</h2>

          {error && (
            <div className="bg-[#fef3f1] border border-[#d72c0d] text-[#d72c0d] text-sm p-3 rounded-lg mb-4 flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#202223] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supplier@example.com"
                required
                className="w-full px-3 py-2.5 border border-[#e1e3e5] rounded-lg text-[#202223] placeholder-[#8c9196] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#202223] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-3 py-2.5 border border-[#e1e3e5] rounded-lg text-[#202223] placeholder-[#8c9196] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] transition-colors text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#008060] text-white py-2.5 rounded-lg hover:bg-[#006e52] active:bg-[#005e46] disabled:bg-[#8c9196] font-medium transition-colors shadow-[0_1px_0_rgba(0,0,0,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)] text-sm"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setError("For this demo, use the credentials shown below.")}
              className="text-[#008060] hover:text-[#006e52] text-sm font-medium transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-[#6d7175] text-xs">
            Demo credentials: <span className="font-medium text-[#202223]">admin@sandbox.store</span> / <span className="font-medium text-[#202223]">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
