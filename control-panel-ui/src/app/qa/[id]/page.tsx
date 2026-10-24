"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, XCircle, CheckCircle2, MonitorPlay, ImageIcon, Share2, Play, Loader2, ExternalLink } from "lucide-react";

interface QaResult {
  id: string;
  qa_run_id: string;
  element_id: string | null;
  issue_type: string;
  description: string;
  screenshot_url: string | null;
  severity: string;
}

interface QaRunDetail {
  id: string;
  app_version_id: string;
  scenario_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  video_url: string | null;
  issues_found: number;
  log_output: string | null;
  app_name?: string;
  version_tag?: string;
  results: QaResult[];
}

export default function QaReportPage() {
  const params = useParams();
  const runId = params.id as string;
  const [run, setRun] = useState<QaRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportLinkCopied, setReportLinkCopied] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState<number>(-1);
  const [liveSandboxUrl, setLiveSandboxUrl] = useState<string | null>(null);
  const [liveSandboxLoading, setLiveSandboxLoading] = useState(false);
  const [liveSandboxError, setLiveSandboxError] = useState<string | null>(null);
  const [livePath, setLivePath] = useState("");

  const fetchRun = useCallback(() => {
    if (!runId) return Promise.resolve();
    return api(`/api/qa-runs/${runId}`)
      .then((data) => setRun(data as QaRunDetail))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load run"));
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    fetchRun().finally(() => setLoading(false));
  }, [runId, fetchRun]);

  // Poll while run is still in progress so we show final status/results
  useEffect(() => {
    if (!runId || !run || run.status !== "running") return;
    const interval = setInterval(() => fetchRun(), 2000);
    return () => clearInterval(interval);
  }, [runId, run?.status, fetchRun]);

  const failureCount = run?.issues_found ?? (run?.results?.filter((r) => !r.description?.includes("returned 200")).length ?? 0);
  const isRunning = run?.status === "running";
  const hasVideo = Boolean(run?.video_url);
  const firstScreenshot = run?.results?.find((r) => r.screenshot_url)?.screenshot_url ?? null;

  // Build walkthrough steps from all results (pass and fail); status from description.
  const walkthroughSteps = (() => {
    const pathResults = (run?.results ?? [])
      .filter((r) => (r.issue_type === "smoke" || r.issue_type === "request") && r.element_id)
      .map((r) => ({ path: r.element_id as string, res: r }));
    const byPath = new Map(pathResults.map(({ path, res }) => [path, res]));
    const paths = Array.from(byPath.keys());
    if (paths.length === 0) return [];
    const rest = paths.filter((p) => p !== "/").sort();
    const sorted = (paths.includes("/") ? ["/"] : []).concat(rest);
    return sorted.map((path) => ({
      path,
      status: (byPath.get(path)?.description?.includes("returned 200") ? "200" : "failed") as "200" | "failed",
    }));
  })();

  // Get actual failure descriptions for a path (to show in iframe area). Only failures, not passes.
  function getFailuresForPath(path: string): QaResult[] {
    if (!run?.results) return [];
    return run.results.filter(
      (r) =>
        (r.issue_type === "smoke" || r.issue_type === "request") &&
        r.element_id === path &&
        !r.description?.includes("returned 200")
    );
  }

  const playWalkthrough = useCallback(() => {
    const duration = liveSandboxUrl ? 1500 : 600;
    setWalkthroughStep(0);
    if (liveSandboxUrl) setLivePath(walkthroughSteps[0]?.path ?? "/");
    walkthroughSteps.forEach((_, i) => {
      setTimeout(() => {
        setWalkthroughStep(i);
        if (liveSandboxUrl) setLivePath(walkthroughSteps[i]?.path ?? "/");
      }, i * duration);
    });
    setTimeout(() => {
      setWalkthroughStep(-1);
      if (liveSandboxUrl) setLivePath(walkthroughSteps[0]?.path ?? "/");
    }, walkthroughSteps.length * duration + 400);
  }, [walkthroughSteps.length, liveSandboxUrl]);

  async function launchLiveSandbox() {
    if (!run) return;
    setLiveSandboxError(null);
    setLiveSandboxLoading(true);
    try {
      let scenarioId = run.scenario_id;
      if (!scenarioId && run.app_version_id) {
        const scenarios = await api(`/api/scenarios?app_version_id=${run.app_version_id}`) as { id: string }[];
        scenarioId = scenarios[0]?.id ?? null;
      }
      if (!scenarioId) {
        setLiveSandboxError("No scenario for this run. Create a scenario for the app version first.");
        return;
      }
      const res = await api("/api/sandboxes", {
        method: "POST",
        body: JSON.stringify({ scenario_id: scenarioId }),
      }) as { sandbox_url: string };
      const base = (res.sandbox_url || "").replace(/\/$/, "");
      // Give the app time to start before showing the iframe
      await new Promise((resolve) => setTimeout(resolve, 8000));
      setLiveSandboxUrl(base);
      setLivePath("/");
    } catch (e) {
      setLiveSandboxError(e instanceof Error ? e.message : "Failed to launch sandbox");
    } finally {
      setLiveSandboxLoading(false);
    }
  }

  function openWatchMedia(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton-block" />
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="space-y-6">
        <Link href="/qa">
          <Button variant="outline" size="sm" className="px-2">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-sm text-destructive">
          {error ?? "QA run not found."}
        </div>
      </div>
    );
  }

  const appLabel = run.app_name ?? "App";
  const versionLabel = run.version_tag ?? "—";
  const summaryText = isRunning
    ? `Run ${run.id} in progress…`
    : run.status !== "passed"
      ? `Run ${run.id} ${run.status}: ${failureCount} recorded issue${failureCount === 1 ? "" : "s"}`
      : `Run ${run.id} completed — all checks passed`;

  const oneLiner = isRunning
    ? "Checks are running. This page will update when the run finishes."
    : run.status === "passed"
      ? "The recorded HTTP smoke checks passed. This does not verify user flows or business behavior."
      : "This run contains failed or incomplete checks. Inspect the recorded evidence below.";

  function narrativeForResult(res: QaResult, index: number): string {
    const step = index + 1;
    if (res.issue_type === "resilience")
      return `Resilience check found: ${res.description?.slice(0, 100) || "probe failed"}`;
    if (res.issue_type === "timeout" || (res.description && res.description.includes("not found")))
      return `Step ${step}: element not found — ${res.element_id || res.description?.slice(0, 60) || "selector timed out"}`;
    if (res.issue_type === "console_error" || (res.description && res.description.includes("500")))
      return `Step ${step}: server error — ${res.description?.slice(0, 80) || "request failed"}`;
    if (res.issue_type === "regression" || res.issue_type === "assertion")
      return `Step ${step}: assertion failed — ${res.description?.slice(0, 80) || res.issue_type}`;
    if (res.issue_type === "smoke" || res.issue_type === "request")
      return res.description || `Step ${step}: request failed`;
    return res.description || `Failure ${step}: ${res.issue_type || "unknown"}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 animate-fade-in-up">
        <Link href="/qa">
          <Button variant="outline" size="sm" className="px-2">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            {appLabel} <span className="text-muted-foreground font-mono text-sm">({versionLabel})</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{summaryText}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{oneLiner}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: "25ms" }}>
        <span>Share this report:</span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => {
            if (typeof window !== "undefined") {
              navigator.clipboard.writeText(window.location.href);
              setReportLinkCopied(true);
              setTimeout(() => setReportLinkCopied(false), 2000);
            }
          }}
        >
          <Share2 className="size-3" />
          {reportLinkCopied ? "Copied!" : "Copy report link"}
        </Button>
      </div>

      {isRunning ? (
        <div className="bg-card border border-border p-8 text-center text-muted-foreground animate-fade-in-up">
          <div className="size-10 mx-auto mb-3 border-2 border-onyx-green border-t-transparent rounded-full animate-spin" />
          <p className="font-medium text-foreground">Run in progress</p>
          <p className="text-sm mt-1">Checks are running. Results will appear here shortly.</p>
        </div>
      ) : (!run.results || run.results.length === 0) && failureCount === 0 ? (
        <div className="bg-card border border-border p-8 text-center text-muted-foreground animate-fade-in-up">
          <CheckCircle2 className="size-10 mx-auto mb-3 text-onyx-green" />
          <p className="font-medium text-foreground">No failures recorded</p>
          <p className="text-sm mt-1">This run completed with no issues reported.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
          <div className="lg:col-span-1 bg-card border border-border p-5 space-y-4">
            <h3 className="text-sm font-semibold border-b border-border pb-2">Results</h3>
            <ul className="space-y-2">
              {run.results?.map((res, idx) => {
                const isPass = res.description?.includes("returned 200");
                const label = res.description?.slice(0, 40).trim();
                return (
                  <li
                    key={(res as QaResult).id ?? idx}
                    className={`flex items-center justify-between gap-2 text-sm ${isPass ? "bg-onyx-green/5 p-1.5 -mx-1 px-1.5 rounded" : (res.severity === "high" || res.severity === "critical") ? "bg-destructive/5 p-1.5 -mx-1 px-1.5 rounded" : ""}`}
                  >
                    <span className="font-medium text-foreground truncate min-w-0" title={res.description ?? ""}>
                      {label ? `${label}${(res.description?.length ?? 0) > 40 ? "…" : ""}` : (res.issue_type === "smoke" || res.issue_type === "request" ? "Request" : res.issue_type || "Issue")}
                    </span>
                    {isPass ? <CheckCircle2 className="size-4 text-onyx-green shrink-0" /> : <XCircle className="size-4 text-destructive shrink-0" />}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {/* What we checked: real media or step-through */}
            <div className="bg-card border border-border p-5">
              <h3 className="text-sm font-semibold border-b border-border pb-2 mb-3">What we checked</h3>
              {(run.video_url || firstScreenshot) ? (
                <div className="flex flex-wrap gap-2">
                  {run.video_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWatchMedia(run.video_url!)}
                      className="gap-1.5"
                    >
                      <MonitorPlay className="size-3.5" />
                      Play recording
                    </Button>
                  )}
                  {firstScreenshot && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openWatchMedia(firstScreenshot)}
                      className="gap-1.5"
                    >
                      <ImageIcon className="size-3.5" />
                      View screenshot
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {!liveSandboxUrl && (
                    <Button
                      variant="onyx"
                      size="sm"
                      onClick={launchLiveSandbox}
                      disabled={liveSandboxLoading}
                      className="gap-1.5"
                    >
                      {liveSandboxLoading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="size-3.5" />
                      )}
                      {liveSandboxLoading ? "Launching… (waiting for app)" : "View live"}
                    </Button>
                  )}
                  {liveSandboxError && (
                    <p className="text-xs text-destructive">{liveSandboxError}</p>
                  )}
                  {liveSandboxUrl && (
                    <div className="border border-border overflow-hidden bg-background rounded">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                        <div className="flex gap-1">
                          <span className="size-2.5 rounded-full bg-destructive/70" />
                          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                          <span className="size-2.5 rounded-full bg-onyx-green/60" />
                        </div>
                        <div className="flex-1 font-mono text-[11px] text-muted-foreground truncate px-2 py-1 bg-background border border-border rounded">
                          {liveSandboxUrl}{livePath || "/"}
                        </div>
                      </div>
                      {getFailuresForPath(livePath || "/").length > 0 && (
                        <div className="px-3 py-2 border-b border-destructive/30 bg-destructive/10 flex flex-col gap-1">
                          <span className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                            <XCircle className="size-3.5 shrink-0" />
                            This check failed
                          </span>
                          {getFailuresForPath(livePath || "/").map((res, idx) => (
                            <p key={(res as QaResult).id ?? idx} className="text-xs text-destructive/90 break-words">
                              {res.description}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="relative w-full overflow-hidden bg-muted/20" style={{ height: "320px" }}>
                        <div
                          className="absolute top-0 left-0 origin-top-left"
                          style={{
                            width: "153.85%",
                            height: "492px",
                            transform: "scale(0.65)",
                          }}
                        >
                          <iframe
                            title="Live app"
                            src={`${liveSandboxUrl}${livePath || "/"}`}
                            className="w-full h-full border-0 block"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {!liveSandboxUrl && (
                    <div className="border border-border overflow-hidden bg-background rounded">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                        <div className="flex gap-1">
                          <span className="size-2.5 rounded-full bg-destructive/70" />
                          <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                          <span className="size-2.5 rounded-full bg-onyx-green/60" />
                        </div>
                        <div className="flex-1 font-mono text-[11px] text-muted-foreground truncate px-2 py-1 bg-background border border-border rounded">
                          https://app.example.com
                          {walkthroughStep >= 0 && walkthroughSteps[walkthroughStep]
                            ? walkthroughSteps[walkthroughStep].path
                            : walkthroughSteps[0]?.path ?? "/"}
                        </div>
                      </div>
                      <div className="min-h-[120px] p-4 flex flex-col items-center justify-center">
                        {walkthroughStep >= 0 && walkthroughSteps[walkthroughStep] ? (
                          walkthroughSteps[walkthroughStep].status !== "failed" ? (
                            <div className="flex flex-col items-center gap-2 text-onyx-green">
                              <CheckCircle2 className="size-10" />
                              <span className="text-sm font-medium">200 OK</span>
                              <span className="text-xs text-muted-foreground">Page loaded</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-destructive">
                              <XCircle className="size-10" />
                              <span className="text-sm font-medium">404 Not Found</span>
                              <span className="text-xs text-muted-foreground text-center max-w-[200px]">
                                Failed to load this URL
                              </span>
                            </div>
                          )
                        ) : (
                          <p className="text-xs text-muted-foreground">Click View live to see the real app, then Replay</p>
                        )}
                      </div>
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={playWalkthrough} className="gap-1.5" disabled={walkthroughStep >= 0}>
                    <Play className="size-3.5" />
                    Replay
                  </Button>
                  <ul className="font-mono text-xs space-y-1.5 border border-border rounded p-2 bg-muted/20">
                    {walkthroughSteps.map((s, i) => {
                      const failures = getFailuresForPath(s.path);
                      const isCurrent = liveSandboxUrl ? (livePath || "/") === s.path : walkthroughStep === i;
                      return (
                        <li
                          key={i}
                          className={`py-1 px-2 transition-colors ${isCurrent ? "bg-onyx-green/10 text-foreground" : "text-muted-foreground"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {liveSandboxUrl ? (
                              <button
                                type="button"
                                onClick={() => { setLivePath(s.path); setWalkthroughStep(i); }}
                                className="text-left hover:underline truncate flex-1 min-w-0"
                              >
                                GET {s.path}
                              </button>
                            ) : (
                              <span>GET {s.path}</span>
                            )}
                            <Badge variant={s.status === "200" ? "success" : "destructive"} className="text-[10px] font-mono shrink-0">
                              {s.status}
                            </Badge>
                          </div>
                          {failures.length > 0 && (
                            <p className="text-[10px] text-destructive mt-0.5 truncate" title={failures.map((f) => f.description).join("; ")}>
                              {failures[0].description}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {(run.results?.filter((r) => !r.description?.includes("returned 200")) ?? []).map((res, idx) => (
              <div
                key={(res as QaResult).id ?? `result-${idx}`}
                className="bg-card border border-destructive p-4 space-y-2 shadow-[0_0_15px_-3px_rgba(239,68,68,0.1)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-destructive flex items-center gap-1.5 shrink-0">
                    <XCircle className="size-4" /> {narrativeForResult(res, idx)}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-destructive/30">
                      {res.severity ?? "medium"}
                    </Badge>
                    {res.screenshot_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openWatchMedia(res.screenshot_url!)}
                        className="h-7 text-xs gap-1"
                      >
                        <ImageIcon className="size-3" />
                        Screenshot
                      </Button>
                    )}
                  </div>
                </div>
                {res.element_id && (
                  <code className="inline-block text-[11px] font-mono bg-muted/50 border border-border px-1.5 py-0.5 rounded break-all max-w-full" title={res.element_id}>
                    {res.element_id.length > 60 ? res.element_id.slice(0, 57) + "…" : res.element_id}
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
