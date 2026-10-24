"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-modal";
import {
  Monitor,
  Play,
  Trash2,
  Save,
  ExternalLink,
  Pencil,
  Search,
  Plus,
  Share2,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface Sandbox {
  id: string;
  scenario_id: string;
  container_id: string;
  port: number;
  sandbox_url: string;
  status: string;
  created_at: string;
  name: string | null;
  app_version_id: string | null;
  shareable_url?: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
}

interface AppVersion {
  id: string;
  app_id: string;
  version_tag: string;
}

interface App {
  id: string;
  name: string;
}

export default function LivePage() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { confirm } = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([api("/api/sandboxes"), api("/api/scenarios"), api("/api/apps")])
      .then(async ([sbs, scs, aps]) => {
        setSandboxes(sbs);
        setScenarios(scs);
        setApps(aps);
        // Fetch all versions for all apps
        const allVersions: AppVersion[] = [];
        for (const app of aps) {
          const vers = await api(`/api/apps/${app.id}/versions`);
          allVersions.push(...vers);
        }
        setVersions(allVersions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function scenarioName(scenarioId: string) {
    return scenarios.find((s) => s.id === scenarioId)?.name || "Unknown";
  }

  function appVersionLabel(appVersionId: string | null) {
    if (!appVersionId) return null;
    const ver = versions.find((v) => v.id === appVersionId);
    if (!ver) return null;
    const app = apps.find((a) => a.id === ver.app_id);
    return `${app?.name || "?"} ${ver.version_tag}`;
  }

  async function destroySandbox(containerId: string) {
    const ok = await confirm({
      title: "Destroy Sandbox",
      description: "This sandbox will be permanently removed.",
      confirmText: "Destroy",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/sandboxes/${containerId}`, { method: "DELETE" });
    setSandboxes((prev) => prev.filter((s) => s.container_id !== containerId));
  }

  async function saveSandbox(containerId: string) {
    const ok = await confirm({
      title: "Save Walkthrough State",
      description: "The current state will be saved as a new scenario. The sandbox will be destroyed after saving.",
      confirmText: "Save State",
    });
    if (!ok) return;
    await api(`/api/sandboxes/${containerId}/save`, { method: "POST" });
    setSandboxes((prev) => prev.filter((s) => s.container_id !== containerId));
  }

  function startRename(containerId: string, currentName: string) {
    setEditingId(containerId);
    setNameDraft(currentName);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitRename(containerId: string) {
    setEditingId(null);
    const trimmed = nameDraft.trim();
    const current = sandboxes.find((s) => s.container_id === containerId);
    if (!trimmed || trimmed === current?.name) return;
    setSandboxes((prev) =>
      prev.map((s) =>
        s.container_id === containerId ? { ...s, name: trimmed } : s
      )
    );
    try {
      await api(`/api/sandboxes/${containerId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      const sbs = await api("/api/sandboxes");
      setSandboxes(sbs);
    }
  }

  async function launchSandbox(scenarioId: string) {
    setLaunching(scenarioId);
    try {
      const result = await api("/api/sandboxes", {
        method: "POST",
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const startUrl = result.start_url && result.start_url !== "/" ? `?startUrl=${encodeURIComponent(result.start_url)}` : "";
      window.location.href = `/sandbox/${result.container_id}${startUrl}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Launch failed");
      setLaunching(null);
    }
  }

  const filtered = sandboxes.filter(
    (sb) =>
      (sb.name || "").toLowerCase().includes(search.toLowerCase()) ||
      sb.container_id.includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-10 w-64 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-semibold">Live Testing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {sandboxes.length} active {sandboxes.length === 1 ? "session" : "sessions"}
          </p>
        </div>
        {scenarios.length > 0 && (
          <div className="flex gap-2">
            <select
              className="h-8 px-3 text-[13px] border border-border bg-card text-foreground outline-none focus:border-ring"
              onChange={(e) => {
                if (e.target.value) launchSandbox(e.target.value);
              }}
              value=""
              disabled={!!launching}
            >
              <option value="" disabled>
                {launching ? "Launching..." : "Launch from scenario..."}
              </option>
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter sessions..."
          className="pl-9"
        />
      </div>

      {/* Sessions table */}
      <div className="bg-card border border-border overflow-hidden animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Monitor className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {sandboxes.length === 0 ? "No active sessions" : "No matches"}
            </p>
            {sandboxes.length === 0 && scenarios.length > 0 && (
              <Button
                variant="onyx"
                size="sm"
                onClick={() => launchSandbox(scenarios[0].id)}
                disabled={!!launching}
              >
                <Play className="size-3.5" />
                Launch First Session
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Session</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">App / Version</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Scenario</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Port</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Container</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Started</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sb) => (
                <tr
                  key={sb.container_id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-3 px-4">
                    {editingId === sb.container_id ? (
                      <input
                        ref={nameInputRef}
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={() => commitRename(sb.container_id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(sb.container_id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        size={Math.max(nameDraft.length, 1)}
                        className="text-sm font-medium bg-transparent border-b border-onyx-green outline-none"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium hover:text-onyx-green transition-colors group"
                        onClick={() => startRename(sb.container_id, sb.name || "")}
                      >
                        {sb.name || `Sandbox :${sb.port}`}
                        <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="success">
                      <span className="size-1.5 rounded-full bg-current mr-0.5" />
                      {sb.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {appVersionLabel(sb.app_version_id) || "—"}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {scenarioName(sb.scenario_id)}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                    :{sb.port}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                    {sb.container_id.substring(0, 12)}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {sb.created_at ? new Date(sb.created_at).toLocaleTimeString() : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
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
                      <Link href={`/sandbox/${sb.container_id}`}>
                        <Button variant="onyx" size="xs">
                          <ExternalLink className="size-3" />
                          Open
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon-xs" onClick={() => saveSandbox(sb.container_id)} title="Save State">
                        <Save className="size-3.5" />
                      </Button>
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
  );
}
