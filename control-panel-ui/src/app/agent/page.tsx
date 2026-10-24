"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

interface Scenario {
  id: string;
  name: string;
  description: string;
  app_version_id: string | null;
}

interface App {
  id: string;
  name: string;
}

interface AppVersion {
  id: string;
  app_id: string;
  version_tag: string;
}

type AgentJobStatus = "pending" | "launching" | "ready" | "error";

interface AgentJob {
  id: string;
  task: string;
  status: AgentJobStatus;
  containerId: string | null;
  error: string | null;
}

export default function AgentPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [focus, setFocus] = useState("");

  // Multi-agent state
  const [phase, setPhase] = useState<
    "idle" | "generating" | "launching" | "done"
  >("idle");
  const [generatingStatus, setGeneratingStatus] = useState("");
  const [jobs, setJobs] = useState<AgentJob[]>([]);

  useEffect(() => {
    Promise.all([api("/api/scenarios"), api("/api/apps")])
      .then(async ([scs, aps]) => {
        setScenarios(scs);
        setApps(aps);
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

  const updateJob = useCallback((id: string, patch: Partial<AgentJob>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...patch } : j))
    );
  }, []);

  const RESILIENCE_INTENT =
    "Probe different parts of the app in order: (1) Search or homepage — try empty string then a very long string in one input. (2) Go to cart or checkout — try negative number or zero in a quantity field, or special characters in a text field. (3) Any other form on a different page. Use a different form or page for each probe; do not repeat the same field. Note any validation error, console error, or server error.";

  async function startResilienceCheck() {
    if (!selectedScenario || phase !== "idle") return;
    const scenario = scenarios.find((s) => s.id === selectedScenario);
    if (!scenario?.app_version_id) {
      alert("Selected scenario has no app version.");
      return;
    }
    try {
      const runRes = await api(`/api/apps/${scenario.app_version_id}/qa-run`, {
        method: "POST",
        body: JSON.stringify({ scenario_id: selectedScenario }),
      }) as { id: string };
      const sandboxRes = await api("/api/sandboxes", {
        method: "POST",
        body: JSON.stringify({ scenario_id: selectedScenario }),
      }) as { container_id: string };
      const qaRunId = runRes.id;
      const url = `/sandbox/${sandboxRes.container_id}?agent=${encodeURIComponent(RESILIENCE_INTENT)}&qa_run_id=${encodeURIComponent(qaRunId)}`;
      window.location.href = url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to start resilience check");
    }
  }

  async function startMultiAgent() {
    if (!selectedScenario || !focus.trim()) return;
    setPhase("generating");
    setJobs([]);

    try {
      // Step 1: Launch a sandbox to get the app's rendered HTML
      setGeneratingStatus("Launching sandbox to capture app HTML…");
      const firstSandbox = await api("/api/sandboxes", {
        method: "POST",
        body: JSON.stringify({ scenario_id: selectedScenario }),
      });

      // Step 2: Wait for it to be ready
      setGeneratingStatus("Waiting for app to start…");
      const sandboxOrigin = new URL(firstSandbox.sandbox_url).origin;
      await waitForSandboxReady(sandboxOrigin, 30000);

      // Step 3: Fetch the rendered HTML
      setGeneratingStatus("Fetching app HTML…");
      let html = "";
      try {
        const res = await fetch(sandboxOrigin);
        html = await res.text();
      } catch {
        // Fallback — still send what we can
        html = `<html><body>App running at ${sandboxOrigin}</body></html>`;
      }

      // Step 4: Send HTML + focus areas to Claude to generate tasks
      setGeneratingStatus(
        "Claude is analyzing the app and generating tasks…"
      );
      const taskResponse = await api("/api/agent/generate-tasks", {
        method: "POST",
        body: JSON.stringify({ html, focus: focus.trim() }),
      });

      const tasks: string[] = taskResponse.tasks;
      if (tasks.length === 0) {
        // Clean up and bail
        try {
          await api(`/api/sandboxes/${firstSandbox.container_id}`, {
            method: "DELETE",
          });
        } catch {}
        setPhase("idle");
        setGeneratingStatus("");
        return;
      }

      // Step 5: Create job entries — first task reuses the sandbox we already have
      const newJobs: AgentJob[] = tasks.map((task, i) => ({
        id: `job-${Date.now()}-${i}`,
        task,
        status: i === 0 ? ("ready" as const) : ("pending" as const),
        containerId: i === 0 ? firstSandbox.container_id : null,
        error: null,
      }));

      setJobs(newJobs);
      setPhase("launching");
      setGeneratingStatus("");

      // Step 6: Launch remaining sandboxes in parallel
      await Promise.all(
        newJobs.slice(1).map(async (job) => {
          try {
            updateJob(job.id, { status: "launching" });
            const sandbox = await api("/api/sandboxes", {
              method: "POST",
              body: JSON.stringify({ scenario_id: selectedScenario }),
            });
            updateJob(job.id, {
              status: "ready",
              containerId: sandbox.container_id,
            });
          } catch (e) {
            updateJob(job.id, {
              status: "error",
              error: e instanceof Error ? e.message : "Launch failed",
            });
          }
        })
      );

      setPhase("done");
    } catch (e) {
      setGeneratingStatus("");
      setPhase("idle");
      alert(e instanceof Error ? e.message : "Failed to start");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-48 skeleton-block" />
      </div>
    );
  }

  const readyCount = jobs.filter((j) => j.status === "ready").length;
  const errorCount = jobs.filter((j) => j.status === "error").length;

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold">AI Agent</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate multiple agent tasks from your app, run them in parallel,
          and record workflows automatically.
        </p>
      </div>

      {/* Configuration */}
      <div
        className="bg-card border border-border p-6 space-y-5 animate-fade-in-up"
        style={{ animationDelay: "50ms" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-onyx-green" />
          <h2 className="text-sm font-semibold">
            Multi-Agent Task Generation
          </h2>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Scenario
          </label>
          <select
            className="w-full h-9 px-3 text-sm border border-input bg-card text-foreground outline-none focus:border-ring"
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            disabled={phase !== "idle"}
          >
            <option value="">Select a scenario...</option>
            {apps.map((app) => {
              const appVersions = versions.filter(
                (v) => v.app_id === app.id
              );
              return appVersions.map((ver) => {
                const verScenarios = scenarios.filter(
                  (s) => s.app_version_id === ver.id
                );
                if (verScenarios.length === 0) return null;
                return (
                  <optgroup
                    key={ver.id}
                    label={`${app.name} — ${ver.version_tag}`}
                  >
                    {verScenarios.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </optgroup>
                );
              });
            })}
            {scenarios.filter((s) => !s.app_version_id).length > 0 && (
              <optgroup label="Unscoped Scenarios">
                {scenarios
                  .filter((s) => !s.app_version_id)
                  .map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}{" "}
                      {sc.description ? `— ${sc.description}` : ""}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            What should the agents focus on?
          </label>
          <div className="relative">
            <Bot className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. checkout flow, search filtering, adding items to cart, account creation"
              className="w-full h-9 pl-9 pr-3 text-sm border border-input bg-card text-foreground outline-none focus:border-ring placeholder:text-muted-foreground/50"
              disabled={phase !== "idle"}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Separate focus areas with commas. One sandbox will be created per area.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="onyx"
            onClick={startMultiAgent}
            disabled={!selectedScenario || !focus.trim() || phase !== "idle"}
            className="gap-2"
          >
            {phase === "idle" ? (
              <>
                <Play className="size-4" />
                Generate & Run Agents
              </>
            ) : (
              <span className="dot-loading">
                Working<span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={startResilienceCheck}
            disabled={!selectedScenario || phase !== "idle"}
            className="gap-2"
            title="Run a single sandbox that probes forms and inputs with edge-case values and records any failures to the QA report"
          >
            <ShieldAlert className="size-4" />
            Run resilience check
          </Button>
        </div>
      </div>

      {/* Generating status */}
      {(phase === "generating" || phase === "launching") &&
        generatingStatus && (
          <div
            className="bg-card border border-border p-5 animate-fade-in-up"
            style={{ animationDelay: "50ms" }}
          >
            <div className="flex items-center gap-3">
              <Loader2 className="size-4 text-onyx-green animate-spin" />
              <p className="text-sm">{generatingStatus}</p>
            </div>
          </div>
        )}

      {/* Jobs list */}
      {jobs.length > 0 && (
        <div
          className="space-y-4 animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="text-sm font-semibold">
            Agent Tasks
            {phase === "done" && (
              <span className="text-muted-foreground font-normal ml-2">
                {readyCount} sandbox{readyCount !== 1 ? "es" : ""} ready
                {errorCount > 0 && `, ${errorCount} failed`}
              </span>
            )}
          </h2>

          <p className="text-xs text-muted-foreground -mt-2">
            Click each sandbox to open it. The agent will run automatically
            and save the workflow when done.
          </p>

          <div className="grid gap-3">
            {jobs.map((job, i) => (
              <div
                key={job.id}
                className="bg-card border border-border p-4 animate-fade-in-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <JobStatusIcon status={job.status} />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {job.status === "ready"
                          ? "Ready"
                          : job.status === "error"
                            ? "Failed"
                            : job.status === "launching"
                              ? "Launching…"
                              : "Pending"}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{job.task}</p>
                    {job.error && (
                      <p className="text-xs text-onyx-coral mt-1">
                        {job.error}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {job.containerId && job.status === "ready" && (
                      <a
                        href={`/sandbox/${job.containerId}?agent=${encodeURIComponent(job.task)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="onyx"
                          size="xs"
                          className="gap-1"
                        >
                          <ExternalLink className="size-3" />
                          Open & Run Agent
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Open all at once — staggered to avoid popup blocker */}
          {phase === "done" && readyCount > 0 && (
            <Button
              variant="onyx"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const readyJobs = jobs.filter(
                  (j) => j.status === "ready" && j.containerId
                );
                // Open first immediately (user-initiated), rest staggered
                readyJobs.forEach((job, i) => {
                  setTimeout(() => {
                    window.open(
                      `/sandbox/${job.containerId}?agent=${encodeURIComponent(job.task)}`,
                      `_agent_${job.id}`
                    );
                  }, i * 300);
                });
              }}
            >
              <ExternalLink className="size-3.5" />
              Open All {readyCount} Sandboxes
            </Button>
          )}
        </div>
      )}

      {/* Done summary */}
      {phase === "done" && jobs.length > 0 && (
        <div className="bg-onyx-green/5 border border-onyx-green/20 p-5 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-onyx-green" />
            <div>
              <p className="text-sm font-semibold">
                {readyCount} sandbox{readyCount !== 1 ? "es" : ""} ready
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Open each sandbox to run the agent. Workflows will be
                auto-saved when the agent finishes.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPhase("idle");
                setJobs([]);
              }}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function JobStatusIcon({ status }: { status: AgentJobStatus }) {
  switch (status) {
    case "pending":
      return <div className="size-3 border border-border" />;
    case "launching":
      return (
        <Loader2 className="size-3 text-muted-foreground animate-spin" />
      );
    case "ready":
      return <CheckCircle2 className="size-3 text-onyx-green" />;
    case "error":
      return <XCircle className="size-3 text-onyx-coral" />;
  }
}

async function waitForSandboxReady(
  origin: string,
  timeoutMs: number
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(origin, { mode: "no-cors" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Sandbox did not become ready in time");
}
