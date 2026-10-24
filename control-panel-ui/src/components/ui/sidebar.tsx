"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Monitor,
  Bot,
  ChevronLeft,
  ChevronRight,
  Beaker,
  BarChart3,
  Settings,
  Waypoints,
  Box,
  Share2,
  ShieldAlert,
  FlaskConical,
  Menu,
  X,
} from "lucide-react";

interface NavSection {
  heading?: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    heading: "Testing",
    items: [
      { label: "Apps", href: "/apps", icon: Box },
      { label: "Test studio", href: "/studio", icon: FlaskConical },
      { label: "Live", href: "/live", icon: Monitor, badge: "LIVE" },
      { label: "AI Agent", href: "/agent", icon: Bot, badge: "NEW" },
      { label: "QA Runs", href: "/qa", icon: ShieldAlert },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Insights", href: "/insights", icon: BarChart3 },
      { label: "Tunnels", href: "/tunnels", icon: Waypoints },
      { label: "Graph", href: "/graph", icon: Share2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // /sandbox/* pages are fullscreen, hide sidebar
  if (pathname.startsWith("/sandbox/")) return null;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/studio") return pathname === "/" || pathname.startsWith("/studio");
    return pathname.startsWith(href);
  }

  return (
    <>
    <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
      <Link href="/studio" className="flex items-center gap-2 font-semibold text-foreground"><Beaker className="size-5 text-emerald-700" /> Q LABS</Link>
      <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg border p-2">
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
    </header>
    {mobileOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="grid shrink-0 grid-cols-2 gap-1 border-b bg-white p-3 md:hidden">
      {NAV_SECTIONS.flatMap(section => section.items).map(item => <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={isActive(item.href) ? "page" : undefined} className={`rounded-lg px-3 py-2.5 text-sm ${isActive(item.href) ? "bg-emerald-50 font-semibold text-emerald-900" : "text-slate-600"}`}>{item.label}</Link>)}
      <Link href="/settings" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 text-sm">Settings</Link>
    </nav>}
    <aside
      className={`hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 ease-out shrink-0 ${
        collapsed ? "w-[60px]" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="size-7 bg-onyx-green flex items-center justify-center shrink-0">
            <Beaker className="size-4 text-onyx-dark" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground tracking-wide whitespace-nowrap">
              Q LABS
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.heading && !collapsed && (
              <div className="px-4 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {section.heading}
                </span>
              </div>
            )}
            {collapsed && si > 0 && (
              <div className="mx-3 mb-2 border-t border-sidebar-border" />
            )}
            <div className="px-2 space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 h-8 transition-colors duration-150 ${
                      collapsed ? "justify-center px-0" : "px-2.5"
                    } ${
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="size-[16px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="text-[13px] font-medium whitespace-nowrap flex-1">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 ${
                            item.badge === "LIVE"
                              ? "bg-onyx-green/20 text-onyx-green"
                              : item.badge === "NEW"
                              ? "bg-onyx-amber/20 text-onyx-amber"
                              : "bg-sidebar-accent text-sidebar-foreground"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-2 shrink-0 space-y-0.5">
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 h-8 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors duration-150 ${
            collapsed ? "justify-center px-0" : "px-2.5"
          }`}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="size-[16px] shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Settings</span>}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center gap-2.5 h-8 w-full text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors duration-150 ${
            collapsed ? "justify-center px-0" : "px-2.5"
          }`}
        >
          {collapsed ? (
            <ChevronRight className="size-[16px] shrink-0" />
          ) : (
            <>
              <ChevronLeft className="size-[16px] shrink-0" />
              <span className="text-[13px] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
    </>
  );
}
