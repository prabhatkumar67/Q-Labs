"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { 
  Building2, Users2, BriefcaseIcon, LayoutDashboard, 
  Eye, Calendar, LogOut, Search, Command
} from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/jobs", label: "Requisitions", icon: BriefcaseIcon },
  { href: "/admin/candidates", label: "Candidates", icon: Users2 },
  { href: "/admin/interviews", label: "Interviews", icon: Calendar },
  { href: "/admin/candidate-preview", label: "Preview Store", icon: Eye },
];

const candidateNavItems = [
  { href: "/careers", label: "Open Roles", icon: Search },
  { href: "/careers/apply", label: "My Applications", icon: Building2 },
];

const titleMap: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Overview", subtitle: "High-level metrics and active pipeline." },
  "/admin/jobs": { title: "Requisitions", subtitle: "Manage open and closed headcount plans." },
  "/admin/candidates": { title: "Candidates", subtitle: "Track moving applicants through stages." },
  "/admin/interviews": { title: "Interviews", subtitle: "Schedule and record interviewer feedback." },
  "/admin/candidate-preview": { title: "Preview", subtitle: "View the public-facing board." },
  "/careers": { title: "Careers", subtitle: "Browse our open opportunities." },
  "/careers/apply": { title: "Applications", subtitle: "Track the status of your applications." },
};

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const isCandidateView = pathname?.startsWith("/careers") ?? false;
  const navItems = isCandidateView ? candidateNavItems : adminNavItems;

  const heading = useMemo(() => {
    if (!pathname) return titleMap["/admin"];
    const exact = titleMap[pathname];
    if (exact) return exact;
    const match = Object.entries(titleMap).find(([key]) => pathname.startsWith(key));
    return match ? match[1] : titleMap["/admin"];
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen w-full bg-[#FAFAFA] font-sans text-foreground" data-testid="workspace-shell">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-[#FDFDFD] flex flex-col justify-between" data-testid="workspace-sidebar">
        
        <div className="px-4 py-5 space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="bg-black text-white p-[5px] rounded-md shadow-sm">
              <Command className="w-[14px] h-[14px]" />
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted-foreground leading-none mb-0.5">
                {isCandidateView ? "Candidate" : "RecruitOps"}
              </p>
              <h1 className="text-[13px] font-semibold tracking-tight leading-tight">
                {isCandidateView ? "Careers Portal" : "Internal Workspace"}
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-0.5 mt-8" data-testid={isCandidateView ? "candidate-nav" : "admin-nav"}>
            {navItems.map((item) => {
              const exactOnly = item.href === "/admin" || item.href === "/careers" || item.href === "/careers/apply";
              const active = exactOnly ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                    active 
                      ? "bg-black/5 text-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="w-[15px] h-[15px] opacity-70" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile / Logout */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"
          >
            <LogOut className="w-[15px] h-[15px] opacity-70" />
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0" data-testid="workspace-main">
        
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-semibold">{heading.title}</h2>
            <div className="h-[14px] w-[1px] bg-border mx-1"></div>
            <p className="text-[13px] text-muted-foreground hidden sm:block">{heading.subtitle}</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="text-[11px] text-muted-foreground rounded-full border border-border px-2 py-1 bg-muted/30">
               Press <kbd className="font-mono bg-background border border-border rounded px-1 shadow-sm mx-0.5">⌘</kbd> <kbd className="font-mono bg-background border border-border rounded px-1 shadow-sm">K</kbd> to search
             </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto p-8" data-testid="workspace-content">
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
