"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-modal";
import { Trash2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const { confirm } = useConfirm();

  async function cleanupAll() {
    const ok = await confirm({
      title: "Cleanup All Sandboxes",
      description: "This will stop and remove ALL running sandbox containers. This cannot be undone.",
      confirmText: "Cleanup All",
      variant: "destructive",
    });
    if (!ok) return;
    setCleaning(true);
    setCleanResult(null);
    try {
      const result = await api("/api/cleanup", { method: "POST" });
      setCleanResult(`Removed ${result.removed} container${result.removed === 1 ? "" : "s"}`);
    } catch (e) {
      setCleanResult(e instanceof Error ? e.message : "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform configuration and maintenance
        </p>
      </div>

      {/* Danger zone */}
      <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <h2 className="text-sm font-semibold mb-3">Maintenance</h2>
        <div className="bg-card border border-border overflow-hidden">
          <div className="p-5 flex items-start justify-between">
            <div className="flex gap-3">
              <div className="size-9 bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="size-4 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-medium">Cleanup All Sandboxes</h3>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                  Stop and remove all running sandbox containers. Use this if containers are stuck or you want to free up resources. Active containers in the database will also be cleared.
                </p>
                {cleanResult && (
                  <p className="text-xs mt-2 text-onyx-green font-medium">{cleanResult}</p>
                )}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={cleanupAll}
              disabled={cleaning}
              className="shrink-0 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {cleaning ? "Cleaning..." : "Cleanup"}
            </Button>
          </div>
        </div>
      </div>

      {/* Platform info */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <h2 className="text-sm font-semibold mb-3">Platform</h2>
        <div className="bg-card border border-border p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono text-xs">0.1.0-dev</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Frontend</span>
            <span className="font-mono text-xs">Next.js + React 19</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Backend</span>
            <span className="font-mono text-xs">FastAPI + Docker</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">AI Agent</span>
            <span className="font-mono text-xs">Claude (Anthropic)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
