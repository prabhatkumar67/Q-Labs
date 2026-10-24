"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Waypoints, Server, RefreshCw } from "lucide-react";

interface HealthStatus {
  status: string;
  docker: string;
}

export default function TunnelsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  async function checkHealth() {
    setChecking(true);
    try {
      const h = await api("/api/health");
      setHealth(h);
    } catch {
      setHealth({ status: "error", docker: "disconnected" });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkHealth().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-48 skeleton-block" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-semibold">Tunnels</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Infrastructure connections and Docker status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={checkHealth} disabled={checking} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Docker connection */}
      <div className="bg-card border border-border overflow-hidden animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Connection</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Health</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50 last:border-0">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-muted-foreground" />
                  <span className="font-medium">Docker Engine</span>
                </div>
              </td>
              <td className="py-3 px-4 text-xs text-muted-foreground">Container Runtime</td>
              <td className="py-3 px-4">
                <Badge variant={health?.docker === "connected" ? "success" : "error"}>
                  <span className="size-1.5 rounded-full bg-current mr-0.5" />
                  {health?.docker || "unknown"}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant={health?.status === "healthy" ? "success" : health?.status === "degraded" ? "warning" : "error"}>
                  {health?.status || "unknown"}
                </Badge>
              </td>
            </tr>
            <tr className="border-b border-border/50 last:border-0">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Waypoints className="size-4 text-muted-foreground" />
                  <span className="font-medium">Control Panel API</span>
                </div>
              </td>
              <td className="py-3 px-4 text-xs text-muted-foreground">FastAPI Backend</td>
              <td className="py-3 px-4">
                <Badge variant={health ? "success" : "error"}>
                  <span className="size-1.5 rounded-full bg-current mr-0.5" />
                  {health ? "connected" : "disconnected"}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <Badge variant="success">healthy</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Port range info */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <h2 className="text-sm font-semibold mb-3">Configuration</h2>
        <div className="bg-card border border-border p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sandbox port range</span>
            <span className="font-mono">8001 – 8050</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target image</span>
            <span className="font-mono">sandbox-target-app</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API endpoint</span>
            <span className="font-mono text-xs">{typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") : "http://localhost:8000"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
