"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-modal";
import {
  Monitor,
  Trash2,
  Plus,
  Box,
  ArrowRight,
  Share2,
} from "lucide-react";

interface Sandbox {
  id: string;
  scenario_id: string;
  container_id: string;
  port: number;
  sandbox_url: string;
  status: string;
  created_at: string;
  name: string | null;
  shareable_url?: string;
}

interface App {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function DashboardPage() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { confirm } = useConfirm();

  useEffect(() => {
    Promise.all([api("/api/sandboxes"), api("/api/apps")])
      .then(([sbs, aps]) => {
        setSandboxes(sbs);
        setApps(aps);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function destroySandbox(containerId: string) {
    const ok = await confirm({
      title: "Destroy Sandbox",
      description: "This sandbox will be permanently removed. This action cannot be undone.",
      confirmText: "Destroy",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/sandboxes/${containerId}`, { method: "DELETE" });
    setSandboxes(sandboxes.filter((s) => s.container_id !== containerId));
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link href="/apps">
          <Button variant="onyx" size="sm">
            <Plus className="size-4" />
            New Sandbox
          </Button>
        </Link>
      </div>

      {/* Active Sandboxes Table */}
      <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Active Sandboxes
          </h2>
          <span className="text-xs text-muted-foreground">
            {sandboxes.length} {sandboxes.length === 1 ? "session" : "sessions"}
          </span>
        </div>

        <div className="bg-card border border-border overflow-hidden">
          {sandboxes.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Monitor className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No active sandboxes
              </p>
              <Link href="/apps">
                <Button variant="outline" size="sm">
                  Browse Apps
                </Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Port</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Container</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sandboxes.map((sb) => (
                  <tr
                    key={sb.container_id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/sandbox/${sb.container_id}`}
                        className="font-medium hover:text-onyx-green transition-colors"
                      >
                        {sb.name || `Sandbox :${sb.port}`}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="success">
                        <span className="size-1.5 rounded-full bg-current mr-0.5" />
                        {sb.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      :{sb.port}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {sb.container_id.substring(0, 12)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {sb.shareable_url && (
                          <Button
                            variant="outline"
                            size="xs"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              navigator.clipboard.writeText(sb.shareable_url!);
                              setCopiedId(sb.container_id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            title="Copy shareable link for customer"
                          >
                            <Share2 className="size-3" />
                            {copiedId === sb.container_id ? "Copied!" : "Copy link for customer"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => destroySandbox(sb.container_id)}
                          title="Destroy"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Your Apps */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            Your Apps
          </h2>
          <Link href="/apps" className="text-xs text-onyx-green hover:underline">
            Manage apps
          </Link>
        </div>
        {apps.length === 0 ? (
          <div className="bg-card border border-border p-8 flex flex-col items-center gap-3">
            <Box className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No apps yet</p>
            <Link href="/apps">
              <Button variant="onyx" size="sm">
                <Plus className="size-4" />
                Create Your First App
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {apps.slice(0, 3).map((app) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}`}
                className="bg-card border border-border p-5 hover:border-onyx-green/30 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Box className="size-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm truncate">{app.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3 line-clamp-2">
                  {app.description || "No description"}
                </p>
                <div className="flex items-center gap-1 text-xs text-onyx-green group-hover:underline">
                  View app
                  <ArrowRight className="size-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
