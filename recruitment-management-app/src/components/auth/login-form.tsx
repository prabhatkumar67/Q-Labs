"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Command } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  accent: "admin" | "user";
  title: string;
  subtitle: string;
  endpoint: "/api/auth/login" | "/api/auth/user-login";
  successRedirect: "/admin" | "/careers";
};

export function LoginForm({ accent, title, subtitle, endpoint, successRedirect }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(
    accent === "admin" ? "admin@recruitops.local" : "candidate@recruitops.local"
  );
  const [password, setPassword] = useState(
    accent === "admin" ? "R3cruitOps!Admin#2026" : "R3cruitOps!Candidate#2026"
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Login failed");
      setLoading(false);
      return;
    }

    router.push(successRedirect);
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative font-sans overflow-hidden" data-testid={`${accent}-login-page`}>
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[#FAFAFA]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute left-0 right-0 top-0 m-auto h-[310px] w-[310px] rounded-full bg-black opacity-[0.02] blur-[100px]"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-[440px] z-10 px-4 sm:px-0">
        <Link href="/" className="inline-flex items-center text-[13px] font-medium text-muted-foreground hover:text-black mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to roles
        </Link>
        
        <div className="flex justify-start mb-6">
          <div className="bg-[#111] text-white p-2 rounded-md shadow-sm">
            <Command className="w-[18px] h-[18px]" />
          </div>
        </div>
        
        <h2 className="text-[22px] font-semibold tracking-tight text-[#111] leading-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-[14px] text-muted-foreground leading-relaxed pe-10">
          {subtitle}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px] z-10 px-4 sm:px-0">
        <div className={`bg-white py-8 px-6 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.1)] border border-[#EAEAEA] sm:rounded-xl sm:px-10 ${accent === "admin" ? "border-t-[3px] border-t-black rounded-t-[10px]" : ""}`} data-testid={`${accent}-login-card`}>
          <form className="space-y-5" onSubmit={onSubmit} data-testid={`${accent}-login-form`}>
            
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              required
              data-testid={`${accent}-login-email`}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              data-testid={`${accent}-login-password`}
            />

            {error && (
              <div className="bg-red-50/50 text-red-600 text-sm p-3 rounded-md border border-red-100" data-testid={`${accent}-login-error`}>
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-10 text-[14px]" 
                disabled={loading} 
                data-testid={`${accent}-login-submit`}
              >
                {loading ? "Authenticating..." : "Sign in to account"}
              </Button>
            </div>
            
          </form>
          
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EAEAEA]" />
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="bg-white px-3 text-muted-foreground uppercase tracking-widest font-semibold">
                  Secure Identity
                </span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
