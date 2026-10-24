"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-modal";
import {
  Box,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Play,
  Plus,
  Trash2,
  Pencil,
  Upload,
  X,
  Workflow,
  Package,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface App {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface AppVersion {
  id: string;
  version_tag: string;
  docker_image_name: string;
  created_at: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  config_json: Record<string, unknown>;
  created_at: string;
  app_version_id: string | null;
}

interface WorkflowEntry {
  id: string;
  name: string;
  steps_json: unknown[];
  scenario_id: string;
  scenario_name?: string;
  created_at: string;
}

function LaunchOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);
  const msgs = ["Provisioning sandbox", "Starting container", "Almost ready"];

  useEffect(() => {
    const t = setInterval(() => setMsgIndex((i) => Math.min(i + 1, msgs.length - 1)), 3000);
    return () => clearInterval(t);
  }, [msgs.length]);

  return (
    <div className="absolute inset-0 z-10 bg-card/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-fade-in rounded-none">
      <div className="w-24 h-1 bg-border relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-onyx-green animate-progress-fill" />
      </div>
      <p
        key={msgIndex}
        className="text-xs text-muted-foreground animate-fade-in"
      >
        {msgs[msgIndex]}
        <span className="dot-loading">
          <span className="inline-block">.</span>
          <span className="inline-block">.</span>
          <span className="inline-block">.</span>
        </span>
      </p>
    </div>
  );
}

export default function AppDetailPage() {
  const params = useParams();
  const appId = params.id as string;

  const [app, setApp] = useState<App | null>(null);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [versionTag, setVersionTag] = useState("");
  const [dataPath, setDataPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Per-version expanded state
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});

  // Per-version scenarios & workflows
  const [versionScenarios, setVersionScenarios] = useState<Record<string, Scenario[]>>({});
  const [versionWorkflows, setVersionWorkflows] = useState<Record<string, WorkflowEntry[]>>({});

  // Per-version create scenario form
  const [showScenarioForm, setShowScenarioForm] = useState<Record<string, boolean>>({});
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [scenarioStartUrl, setScenarioStartUrl] = useState("/");
  const [scenarioEnvRows, setScenarioEnvRows] = useState<{ key: string; value: string }[]>([{ key: "", value: "" }]);

  const [launching, setLaunching] = useState<string | null>(null);
  const [qaProgress, setQaProgress] = useState<{ runId: string; step: string } | null>(null);

  const { confirm } = useConfirm();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const loadApp = useCallback(async () => {
    try {
      const data = await api(`/api/apps/${appId}`);
      setApp(data);
    } catch (e) {
      console.error(e);
    }
  }, [appId]);

  const loadVersions = useCallback(async () => {
    try {
      const data = await api(`/api/apps/${appId}/versions`);
      setVersions(data);
    } catch (e) {
      console.error(e);
    }
  }, [appId]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadApp(), loadVersions()]);
      setLoading(false);
    }
    init();
  }, [loadApp, loadVersions]);

  function toggleVersion(versionId: string) {
    setExpandedVersions((prev) => {
      const next = { ...prev, [versionId]: !prev[versionId] };
      if (next[versionId]) {
        loadVersionScenarios(versionId);
        loadVersionWorkflows(versionId);
      }
      return next;
    });
  }

  async function loadVersionScenarios(versionId: string) {
    try {
      const data = await api(`/api/scenarios?app_version_id=${versionId}`);
      setVersionScenarios((prev) => ({ ...prev, [versionId]: data }));
    } catch (e) {
      console.error(e);
    }
  }

  async function loadVersionWorkflows(versionId: string) {
    try {
      const data = await api(`/api/workflows?app_version_id=${versionId}`);
      setVersionWorkflows((prev) => ({ ...prev, [versionId]: data }));
    } catch (e) {
      console.error(e);
    }
  }

  function startRename() {
    if (!app) return;
    setNameDraft(app.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitRename() {
    setEditingName(false);
    if (!app) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === app.name) return;
    const prev = { ...app };
    setApp({ ...app, name: trimmed });
    try {
      await api(`/api/apps/${appId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      setApp(prev);
    }
  }

  function startEditDesc() {
    if (!app) return;
    setDescDraft(app.description);
    setEditingDesc(true);
  }

  async function commitDesc() {
    setEditingDesc(false);
    if (!app || descDraft === app.description) return;
    const prev = { ...app };
    setApp({ ...app, description: descDraft });
    try {
      await api(`/api/apps/${appId}`, {
        method: "PATCH",
        body: JSON.stringify({ description: descDraft }),
      });
    } catch {
      setApp(prev);
    }
  }

  async function deleteApp() {
    const ok = await confirm({
      title: "Delete App",
      description:
        "This app and all its versions will be permanently removed. Any sandboxes launched from it will not be affected.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/apps/${appId}`, { method: "DELETE" });
    window.location.href = "/apps";
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  async function uploadVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("version_tag", versionTag);
      if (dataPath.trim()) {
        formData.append("data_path", dataPath.trim());
      }
      const newVersion = await new Promise<{ id: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_URL}/api/apps/${appId}/versions`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const body = JSON.parse(xhr.responseText);
              resolve(body);
            } catch {
              resolve({ id: "" });
            }
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body.detail || `Upload failed: ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });
      setUploadFile(null);
      setVersionTag("");
      setDataPath("");
      setShowUploadForm(false);
      setUploadProgress(0);
      await loadVersions();
      if (newVersion?.id) {
        setExpandedVersions((prev) => ({ ...prev, [newVersion.id]: true }));
        setShowScenarioForm((prev) => ({ ...prev, [newVersion.id]: true }));
        loadVersionScenarios(newVersion.id);
        loadVersionWorkflows(newVersion.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function runAutoQA(versionId: string, scenarios: Scenario[]) {
    try {
      setQaProgress({ runId: "", step: "Starting run…" });
      const runRes = await api(`/api/apps/${versionId}/qa-run`, {
        method: "POST",
        body: JSON.stringify({ scenario_id: scenarios?.[0]?.id ?? null }),
      }) as { id: string };
      const runId = runRes.id;
      setQaProgress({ runId, step: "Launching environment…" });
      await api(`/api/qa-runs/${runId}/execute`, { method: "POST" });
      setQaProgress({ runId, step: "Opening report…" });
      await new Promise((r) => setTimeout(r, 600));
      window.location.href = `/qa/${runId}`;
    } catch (err) {
      setQaProgress(null);
      alert(err instanceof Error ? err.message : "Failed to start QA run");
    }
  }

  async function deleteVersion(versionId: string) {
    const ok = await confirm({
      title: "Delete Version",
      description:
        "This version will be permanently removed. Any sandboxes launched from it will not be affected.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/apps/${appId}/versions/${versionId}`, { method: "DELETE" });
    setVersions(versions.filter((v) => v.id !== versionId));
  }

  async function createScenario(e: React.FormEvent, versionId: string) {
    e.preventDefault();
    const env: Record<string, string> = {};
    for (const row of scenarioEnvRows) {
      if (row.key.trim()) env[row.key.trim()] = row.value;
    }
    const config: Record<string, unknown> = { start_url: scenarioStartUrl, env };
    try {
      await api("/api/scenarios", {
        method: "POST",
        body: JSON.stringify({
          name: scenarioName,
          description: scenarioDescription,
          config_json: config,
          app_version_id: versionId,
        }),
      });
      setScenarioName("");
      setScenarioDescription("");
      setScenarioStartUrl("/");
      setScenarioEnvRows([{ key: "", value: "" }]);
      setShowScenarioForm((prev) => ({ ...prev, [versionId]: false }));
      loadVersionScenarios(versionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create scenario");
    }
  }

  function updateScenarioEnvRow(index: number, field: "key" | "value", val: string) {
    setScenarioEnvRows((prev) => {
      const next = prev.map((r, i) => i === index ? { ...r, [field]: val } : r);
      if (index === next.length - 1 && (next[index].key || next[index].value)) {
        next.push({ key: "", value: "" });
      }
      return next;
    });
  }

  function removeScenarioEnvRow(index: number) {
    setScenarioEnvRows((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ key: "", value: "" }]);
  }

  async function renameScenario(scenarioId: string, name: string, versionId: string) {
    setVersionScenarios((prev) => ({
      ...prev,
      [versionId]: (prev[versionId] || []).map((s) =>
        s.id === scenarioId ? { ...s, name } : s
      ),
    }));
    try {
      await api(`/api/scenarios/${scenarioId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
    } catch {
      loadVersionScenarios(versionId);
    }
  }

  async function renameWorkflow(workflowId: string, name: string, versionId: string) {
    setVersionWorkflows((prev) => ({
      ...prev,
      [versionId]: (prev[versionId] || []).map((w) =>
        w.id === workflowId ? { ...w, name } : w
      ),
    }));
    try {
      await api(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
    } catch {
      loadVersionWorkflows(versionId);
    }
  }

  async function deleteScenario(scenarioId: string, versionId: string) {
    const affectedWorkflows = (versionWorkflows[versionId] || []).filter(
      (w) => w.scenario_id === scenarioId
    );
    const ok = await confirm({
      title: "Delete Scenario",
      description: affectedWorkflows.length > 0
        ? `This scenario and ${affectedWorkflows.length} associated workflow${affectedWorkflows.length === 1 ? "" : "s"} will be permanently removed. Any sandboxes launched from it will not be affected.`
        : "This scenario will be permanently removed. Any sandboxes launched from it will not be affected.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/scenarios/${scenarioId}`, { method: "DELETE" });
    setVersionScenarios((prev) => ({
      ...prev,
      [versionId]: (prev[versionId] || []).filter((s) => s.id !== scenarioId),
    }));
    setVersionWorkflows((prev) => ({
      ...prev,
      [versionId]: (prev[versionId] || []).filter((w) => w.scenario_id !== scenarioId),
    }));
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

  async function deleteWorkflow(workflowId: string, versionId: string) {
    const ok = await confirm({
      title: "Delete Workflow",
      description:
        "This workflow will be permanently removed.",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/workflows/${workflowId}`, { method: "DELETE" });
    setVersionWorkflows((prev) => ({
      ...prev,
      [versionId]: (prev[versionId] || []).filter((w) => w.id !== workflowId),
    }));
  }

  async function replayWorkflow(workflow: WorkflowEntry) {
    setLaunching(workflow.scenario_id);
    try {
      const result = await api("/api/sandboxes", {
        method: "POST",
        body: JSON.stringify({ scenario_id: workflow.scenario_id }),
      });
      window.location.href = `/sandbox/${result.container_id}?workflow=${workflow.id}`;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Launch failed");
      setLaunching(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-6 w-24 skeleton-block" />
        <div className="h-8 w-64 skeleton-block" />
        <div className="h-12 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="space-y-6">
        <div className="py-16 flex flex-col items-center gap-3">
          <Box className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">App not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* App header */}
      <div className="flex items-start justify-between animate-fade-in-up">
        <div>
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingName(false);
              }}
              size={Math.max(nameDraft.length, 1)}
              className="text-2xl font-semibold bg-transparent border-b border-onyx-green outline-none"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="flex items-center gap-1.5 text-2xl font-semibold hover:text-onyx-green transition-colors group"
              onClick={startRename}
            >
              {app.name}
              <Pencil className="size-4 opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          )}
          {editingDesc ? (
            <input
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={commitDesc}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDesc();
                if (e.key === "Escape") setEditingDesc(false);
              }}
              size={Math.max(descDraft.length, 20)}
              className="text-sm text-muted-foreground mt-0.5 bg-transparent border-b border-onyx-green outline-none"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="text-sm text-muted-foreground mt-0.5 hover:text-foreground transition-colors text-left"
              onClick={startEditDesc}
            >
              {app.description || "Add a description..."}
            </button>
          )}
        </div>
        <Button variant="destructive" size="sm" onClick={deleteApp}>
          <Trash2 className="size-4" />
          Delete App
        </Button>
      </div>

      {/* Versions section */}
      <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Versions</h2>
          <Button
            variant={showUploadForm ? "outline" : "onyx"}
            size="sm"
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            {showUploadForm ? (
              <>
                <X className="size-4" />
                Cancel
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Upload New Version
              </>
            )}
          </Button>
        </div>

        {/* Upload form */}
        {showUploadForm && (
          <div className="bg-card rounded-none border border-border p-6 animate-fade-in-scale">
            <h3 className="font-semibold mb-4">Upload Version</h3>
            <form onSubmit={uploadVersion} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Docker Image (.tar)
                </label>
                {!uploadFile ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file?.name.endsWith(".tar")) setUploadFile(file);
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".tar";
                      input.onchange = (ev) => {
                        const file = (ev.target as HTMLInputElement).files?.[0];
                        if (file) setUploadFile(file);
                      };
                      input.click();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        (e.target as HTMLElement).click();
                      }
                    }}
                    className={cn(
                      "border-2 border-dashed py-8 px-4 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200",
                      dragOver
                        ? "border-onyx-green bg-onyx-green/5"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "size-10 flex items-center justify-center border transition-colors",
                      dragOver ? "border-onyx-green/30 bg-onyx-green/10" : "border-border bg-muted/50"
                    )}>
                      <Upload className={cn("size-5 transition-colors", dragOver ? "text-onyx-green" : "text-muted-foreground")} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {dragOver ? "Drop file here" : "Drop your .tar file here"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        or click to browse
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-border bg-muted/20 p-3 flex items-center gap-3">
                    <div className="size-9 flex items-center justify-center bg-onyx-green/10 border border-onyx-green/20 shrink-0">
                      <Package className="size-4 text-onyx-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatFileSize(uploadFile.size)}
                      </p>
                    </div>
                    {!uploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setUploadFile(null)}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Version Tag
                </label>
                <Input
                  value={versionTag}
                  onChange={(e) => setVersionTag(e.target.value)}
                  required
                  placeholder="e.g. v1.0.0"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Data Path
                </label>
                <Input
                  value={dataPath}
                  onChange={(e) => setDataPath(e.target.value)}
                  placeholder="/app/data"
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Container directory to save/restore state from. Defaults to /app/data.
                </p>
              </div>

              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Uploading image...</span>
                    <span className="font-mono text-muted-foreground">{uploadProgress}%</span>
                  </div>
                  <div className="h-1 bg-border overflow-hidden">
                    <div
                      className="h-full bg-onyx-green transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" variant="onyx" disabled={uploading || !uploadFile}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* QA run progress */}
        {qaProgress && (
          <div className="flex items-center gap-3 px-4 py-3 rounded border border-onyx-green/30 bg-onyx-green/5 text-sm animate-fade-in-up">
            <div className="size-5 border-2 border-onyx-green border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="font-medium text-foreground">{qaProgress.step}</span>
            {qaProgress.runId && (
              <span className="text-muted-foreground font-mono text-xs">Run {qaProgress.runId.slice(0, 8)}…</span>
            )}
          </div>
        )}

        {/* Versions table */}
        <div className="bg-card rounded-none border border-border overflow-hidden">
          {versions.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Box className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No versions yet</p>
              <p className="text-xs text-muted-foreground/60">
                Upload a Docker image to get started
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground w-8" />
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Version Tag</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Docker Image</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Created</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((ver) => {
                  const isExpanded = expandedVersions[ver.id] ?? false;
                  const scenarios = versionScenarios[ver.id] || [];
                  const workflows = versionWorkflows[ver.id] || [];
                  const showingScenarioForm = showScenarioForm[ver.id] ?? false;

                  return (
                    <VersionRow
                      key={ver.id}
                      version={ver}
                      isExpanded={isExpanded}
                      scenarios={scenarios}
                      workflows={workflows}
                      showingScenarioForm={showingScenarioForm}
                      scenarioName={scenarioName}
                      scenarioDescription={scenarioDescription}
                      scenarioStartUrl={scenarioStartUrl}
                      scenarioEnvRows={scenarioEnvRows}
                      launching={launching}
                      onToggle={() => toggleVersion(ver.id)}
                      onDeleteVersion={() => deleteVersion(ver.id)}
                      onToggleScenarioForm={() => {
                        setShowScenarioForm((prev) => ({ ...prev, [ver.id]: !prev[ver.id] }));
                        setScenarioName("");
                        setScenarioDescription("");
                        setScenarioStartUrl("/");
                        setScenarioEnvRows([{ key: "", value: "" }]);
                      }}
                      onScenarioNameChange={setScenarioName}
                      onScenarioDescriptionChange={setScenarioDescription}
                      onScenarioStartUrlChange={setScenarioStartUrl}
                      onScenarioEnvRowsChange={setScenarioEnvRows}
                      onCreateScenario={(e) => createScenario(e, ver.id)}
                      onDeleteScenario={(scenarioId) => deleteScenario(scenarioId, ver.id)}
                      onRenameScenario={(scenarioId, name) => renameScenario(scenarioId, name, ver.id)}
                      onLaunchSandbox={launchSandbox}
                      onDeleteWorkflow={(workflowId) => deleteWorkflow(workflowId, ver.id)}
                      onRenameWorkflow={(workflowId, name) => renameWorkflow(workflowId, name, ver.id)}
                      onReplayWorkflow={replayWorkflow}
                      onRunAutoQA={() => runAutoQA(ver.id, scenarios)}
                      qaProgress={qaProgress}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Version Row Component ── */

interface VersionRowProps {
  version: AppVersion;
  isExpanded: boolean;
  scenarios: Scenario[];
  workflows: WorkflowEntry[];
  showingScenarioForm: boolean;
  scenarioName: string;
  scenarioDescription: string;
  scenarioStartUrl: string;
  scenarioEnvRows: { key: string; value: string }[];
  launching: string | null;
  onToggle: () => void;
  onDeleteVersion: () => void;
  onToggleScenarioForm: () => void;
  onScenarioNameChange: (v: string) => void;
  onScenarioDescriptionChange: (v: string) => void;
  onScenarioStartUrlChange: (v: string) => void;
  onScenarioEnvRowsChange: (rows: { key: string; value: string }[]) => void;
  onCreateScenario: (e: React.FormEvent) => void;
  onDeleteScenario: (scenarioId: string) => void;
  onRenameScenario: (scenarioId: string, name: string) => void;
  onLaunchSandbox: (scenarioId: string) => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onRenameWorkflow: (workflowId: string, name: string) => void;
  onReplayWorkflow: (workflow: WorkflowEntry) => void;
  onRunAutoQA: () => void;
  qaProgress: { runId: string; step: string } | null;
}

function VersionRow({
  version,
  isExpanded,
  scenarios,
  workflows,
  showingScenarioForm,
  scenarioName,
  scenarioDescription,
  scenarioStartUrl,
  scenarioEnvRows,
  launching,
  onToggle,
  onDeleteVersion,
  onToggleScenarioForm,
  onScenarioNameChange,
  onScenarioDescriptionChange,
  onScenarioStartUrlChange,
  onScenarioEnvRowsChange,
  onCreateScenario,
  onDeleteScenario,
  onRenameScenario,
  onLaunchSandbox,
  onDeleteWorkflow,
  onRenameWorkflow,
  onReplayWorkflow,
  onRunAutoQA,
  qaProgress,
}: VersionRowProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setDraft(current);
  }

  function commitEdit(id: string, type: "scenario" | "workflow") {
    setEditingId(null);
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (type === "scenario") onRenameScenario(id, trimmed);
    else onRenameWorkflow(id, trimmed);
  }
  return (
    <>
      <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
        <td className="py-3 px-4">
          <button type="button" onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors">
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </td>
        <td className="py-3 px-4 font-medium">{version.version_tag}</td>
        <td className="py-3 px-4">
          <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5">
            {version.docker_image_name}
          </code>
        </td>
        <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
          {new Date(version.created_at).toLocaleDateString()}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center justify-end gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs mr-2"
              onClick={(e) => {
                e.stopPropagation();
                onRunAutoQA();
              }}
              disabled={!!qaProgress}
            >
              <FlaskConical className="size-3.5 mr-1.5" />
              Run Auto-QA
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDeleteVersion}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete version"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Expanded content */}
      {isExpanded && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="bg-muted/10 border-t border-border/30 px-8 py-6 space-y-6">

              {/* Scenarios sub-section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <FlaskConical className="size-4 text-muted-foreground" />
                    Scenarios
                  </h4>
                  <Button
                    variant={showingScenarioForm ? "outline" : "onyx"}
                    size="xs"
                    onClick={onToggleScenarioForm}
                  >
                    {showingScenarioForm ? (
                      <>
                        <X className="size-3" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="size-3" />
                        New Scenario
                      </>
                    )}
                  </Button>
                </div>

                {/* Create scenario form */}
                {showingScenarioForm && (
                  <div className="bg-card rounded-none border border-border p-4 animate-fade-in-scale">
                    <form onSubmit={onCreateScenario} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Name
                        </label>
                        <Input
                          value={scenarioName}
                          onChange={(e) => onScenarioNameChange(e.target.value)}
                          required
                          placeholder="e.g. Low Inventory Test"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Description
                        </label>
                        <Input
                          value={scenarioDescription}
                          onChange={(e) => onScenarioDescriptionChange(e.target.value)}
                          placeholder="Optional description"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Starting URL
                        </label>
                        <Input
                          value={scenarioStartUrl}
                          onChange={(e) => onScenarioStartUrlChange(e.target.value)}
                          placeholder="/"
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Environment Variables
                        </label>
                        <div className="space-y-1.5">
                          {scenarioEnvRows.map((row, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <Input
                                value={row.key}
                                onChange={(e) => {
                                  const next = scenarioEnvRows.map((r, j) => j === i ? { ...r, key: e.target.value } : r);
                                  if (i === next.length - 1 && (next[i].key || next[i].value)) next.push({ key: "", value: "" });
                                  onScenarioEnvRowsChange(next);
                                }}
                                placeholder="KEY"
                                className="font-mono flex-1"
                              />
                              <span className="text-muted-foreground text-xs">=</span>
                              <Input
                                value={row.value}
                                onChange={(e) => {
                                  const next = scenarioEnvRows.map((r, j) => j === i ? { ...r, value: e.target.value } : r);
                                  if (i === next.length - 1 && (next[i].key || next[i].value)) next.push({ key: "", value: "" });
                                  onScenarioEnvRowsChange(next);
                                }}
                                placeholder="value"
                                className="font-mono flex-1"
                              />
                              {scenarioEnvRows.length > 1 && row.key && (
                                <button
                                  type="button"
                                  onClick={() => onScenarioEnvRowsChange(scenarioEnvRows.filter((_, j) => j !== i))}
                                  className="text-muted-foreground hover:text-destructive text-xs px-1"
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Optional: <code className="bg-muted/50 px-0.5">DEMO_BUG</code>=<code className="bg-muted/50 px-0.5">1</code> makes /cart return 404 for QA demos; omit or set to 0 for a passing run.
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" variant="onyx" size="sm">Create Scenario</Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Scenarios table */}
                <div className="bg-card rounded-none border border-border overflow-hidden">
                  {scenarios.length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-2">
                      <FlaskConical className="size-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No scenarios for this version</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Description</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Created</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenarios.map((sc) => (
                          <tr
                            key={sc.id}
                            className="relative border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            {launching === sc.id && (
                              <td colSpan={4} className="absolute inset-0">
                                <LaunchOverlay />
                              </td>
                            )}
                            <td className="py-2.5 px-3 font-medium">
                              {editingId === sc.id ? (
                                <input
                                  value={draft}
                                  onChange={(e) => setDraft(e.target.value)}
                                  onBlur={() => commitEdit(sc.id, "scenario")}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitEdit(sc.id, "scenario");
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                  size={Math.max(draft.length, 1)}
                                  className="text-sm font-medium bg-transparent border-b border-onyx-green outline-none"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="hover:text-onyx-green transition-colors"
                                  onClick={() => startEdit(sc.id, sc.name)}
                                >
                                  {sc.name}
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground max-w-[160px] truncate">
                              {sc.description || "---"}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(sc.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="onyx"
                                  size="xs"
                                  onClick={() => onLaunchSandbox(sc.id)}
                                  disabled={launching === sc.id}
                                >
                                  <Play className="size-3" />
                                  Launch
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => onDeleteScenario(sc.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete"
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

              {/* Workflows sub-section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Workflow className="size-4 text-muted-foreground" />
                  Workflows
                </h4>

                <div className="bg-card rounded-none border border-border overflow-hidden">
                  {workflows.length === 0 ? (
                    <div className="py-8 flex flex-col items-center gap-2">
                      <Workflow className="size-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No workflows for this version</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Name</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Start Scenario</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Created</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workflows.map((wf) => (
                          <tr
                            key={wf.id}
                            className="relative border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            {launching === wf.scenario_id && (
                              <td colSpan={4} className="absolute inset-0">
                                <LaunchOverlay />
                              </td>
                            )}
                            <td className="py-2.5 px-3 font-medium">
                              {editingId === wf.id ? (
                                <input
                                  value={draft}
                                  onChange={(e) => setDraft(e.target.value)}
                                  onBlur={() => commitEdit(wf.id, "workflow")}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitEdit(wf.id, "workflow");
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                  size={Math.max(draft.length, 1)}
                                  className="text-sm font-medium bg-transparent border-b border-onyx-green outline-none"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="hover:text-onyx-green transition-colors"
                                  onClick={() => startEdit(wf.id, wf.name)}
                                >
                                  {wf.name}
                                  <span className="text-xs text-muted-foreground font-normal ml-1.5">
                                    ({Array.isArray(wf.steps_json) ? wf.steps_json.length : 0} steps)
                                  </span>
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground">
                              {wf.scenario_name || scenarios.find((s) => s.id === wf.scenario_id)?.name || wf.scenario_id.slice(0, 8)}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(wf.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="onyx"
                                  size="xs"
                                  onClick={() => onReplayWorkflow(wf)}
                                  disabled={launching === wf.scenario_id}
                                >
                                  <Play className="size-3" />
                                  Replay
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => onDeleteWorkflow(wf.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete"
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

            </div>
          </td>
        </tr>
      )}
    </>
  );
}
