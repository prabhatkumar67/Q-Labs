"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/confirm-modal";
import {
  ArrowLeft,
  Play,
  Trash2,
  Pencil,
  Check,
  X,
  GitBranch,
  Clock,
  Footprints,
} from "lucide-react";
import Link from "next/link";

interface Scenario {
  id: string;
  name: string;
  description: string;
  config_json: Record<string, unknown>;
  created_at: string;
  parent_scenario_id: string | null;
  walkthrough_steps: { index: number; action: string; selector: string; elementText: string; url: string; inputValue?: string }[] | null;
}

export default function ScenarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const { confirm } = useConfirm();

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // Inline description editing
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");


  useEffect(() => {
    api(`/api/scenarios/${id}`)
      .then((data) => setScenario(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function saveField(field: string, value: unknown) {
    if (!scenario) return;
    try {
      await api(`/api/scenarios/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      // reload on error
      const data = await api(`/api/scenarios/${id}`);
      setScenario(data);
    }
  }

  function startEditName() {
    if (!scenario) return;
    setNameDraft(scenario.name);
    setEditingName(true);
    setTimeout(() => nameRef.current?.select(), 0);
  }

  async function commitName() {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!scenario || !trimmed || trimmed === scenario.name) return;
    setScenario((s) => s ? { ...s, name: trimmed } : s);
    await saveField("name", trimmed);
  }

  function startEditDesc() {
    if (!scenario) return;
    setDescDraft(scenario.description);
    setEditingDesc(true);
  }

  async function commitDesc() {
    setEditingDesc(false);
    if (!scenario || descDraft === scenario.description) return;
    setScenario((s) => s ? { ...s, description: descDraft } : s);
    await saveField("description", descDraft);
  }

  async function launchSandbox() {
    if (!scenario) return;
    setLaunching(true);
    try {
      const result = await api("/api/sandboxes", {
        method: "POST",
        body: JSON.stringify({ scenario_id: scenario.id }),
      });
      const startUrl = result.start_url && result.start_url !== "/" ? `?startUrl=${encodeURIComponent(result.start_url)}` : "";
      window.location.href = `/sandbox/${result.container_id}${startUrl}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Launch failed");
      setLaunching(false);
    }
  }

  async function deleteScenario() {
    const ok = await confirm({
      title: "Delete Scenario",
      description: "This scenario will be permanently removed.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/scenarios/${id}`, { method: "DELETE" });
    router.push("/scenarios");
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-64 skeleton-block" />
        <div className="h-48 skeleton-block" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm text-muted-foreground">Scenario not found</p>
        <Link href="/scenarios">
          <Button variant="outline" size="sm">Back to Scenarios</Button>
        </Link>
      </div>
    );
  }

  const rawSteps = scenario.walkthrough_steps;
  const steps = Array.isArray(rawSteps) ? rawSteps : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <Link href="/scenarios">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {editingName ? (
                <input
                  ref={nameRef}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  size={Math.max(nameDraft.length, 1)}
                  className="text-2xl font-semibold bg-transparent border-b border-onyx-green outline-none"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-2 hover:text-onyx-green transition-colors group"
                  onClick={startEditName}
                >
                  <h1 className="text-2xl font-semibold">{scenario.name}</h1>
                  <Pencil className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </button>
              )}
              {scenario.parent_scenario_id && (
                <Badge variant="secondary">
                  <GitBranch className="size-3 mr-0.5" />
                  walkthrough
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {new Date(scenario.created_at).toLocaleString()}
              </span>
              {steps && (
                <span className="flex items-center gap-1">
                  <Footprints className="size-3" />
                  {steps.length} steps
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="onyx"
            size="sm"
            onClick={launchSandbox}
            disabled={launching}
            className="gap-1.5"
          >
            <Play className="size-3.5" />
            {launching ? "Launching..." : "Launch Sandbox"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={deleteScenario}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Description */}
      <div className="animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Description</h2>
          {!editingDesc && (
            <button
              type="button"
              onClick={startEditDesc}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Pencil className="size-3" />
              Edit
            </button>
          )}
        </div>
        <div className="bg-card border border-border p-4">
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                autoFocus
              />
              <div className="flex gap-1.5">
                <Button size="xs" variant="onyx" onClick={commitDesc} className="gap-1">
                  <Check className="size-3" />
                  Save
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setEditingDesc(false)} className="gap-1">
                  <X className="size-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {scenario.description || "No description"}
            </p>
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <h2 className="text-sm font-semibold mb-2">Configuration</h2>
        {(() => {
          const cfg = (scenario.config_json || {}) as Record<string, unknown>;
          const startUrl = cfg.start_url as string || "/";
          const env = (cfg.env || {}) as Record<string, string>;
          const envEntries = Object.entries(env);
          // For legacy configs that don't have the env/start_url structure,
          // show all top-level keys except start_url and env as env vars
          const legacyEntries = Object.entries(cfg).filter(([k]) => k !== "start_url" && k !== "env");
          const allEnv = envEntries.length > 0 ? envEntries : legacyEntries;

          return (
            <div className="bg-card border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 px-4 text-xs text-muted-foreground w-48">Starting URL</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{startUrl}</td>
                  </tr>
                  {allEnv.length > 0 ? (
                    allEnv.map(([key, val]) => (
                      <tr key={key} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{key}</td>
                        <td className="py-2.5 px-4 font-mono text-xs">{typeof val === "object" ? JSON.stringify(val) : String(val)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground" colSpan={2}>No environment variables set</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Walkthrough Steps */}
      {steps && steps.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          <h2 className="text-sm font-semibold mb-2">Walkthrough Steps</h2>
          <div className="bg-card border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground w-12">#</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Action</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Target</th>
                  <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Page</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2 px-4 text-xs text-muted-foreground font-mono">{i + 1}</td>
                    <td className="py-2 px-4">
                      <Badge variant={step.action === "input" ? "warning" : "secondary"} className="text-[10px]">
                        {step.action || "click"}
                      </Badge>
                      {step.inputValue && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          &quot;{step.inputValue.slice(0, 40)}&quot;
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 font-mono text-xs text-muted-foreground truncate max-w-[250px]">
                      {step.elementText || step.selector}
                    </td>
                    <td className="py-2 px-4 font-mono text-xs text-muted-foreground">
                      {step.url}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
