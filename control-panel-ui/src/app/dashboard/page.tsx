"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Box, CheckCircle2, ChevronDown, Database, Loader2, Mic, Monitor,
  Play, Share2, Trash2, TriangleAlert, XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useConfirm } from "@/components/ui/confirm-modal";
import { ACTION_LABELS, API_URL, formatActual, type Action, type Run, type SavedPlan, type Target } from "../studio/types";
import { AiBrief, type Brief } from "./ai-brief";
import { appHealth, buckets, formatMs, openFailures, RANGES, runDuration, summarize, timeAgo, type Bucket, type Range } from "./metrics";
import { RunsChart } from "./runs-chart";
import "./dashboard.css";

type Sandbox = { id: string; container_id: string; port: number; status: string; name: string | null; shareable_url?: string };
type PlatformApp = { id: string; name: string; description: string };
type Suite = { id: string; label: string; total: number; done: number; passed: number; failed: number; errored: number; finished: boolean; target_id?: string };
type Filter = "all" | "passed" | "failed";

const STATUS_ICON = { passed: CheckCircle2, failed: XCircle, errored: TriangleAlert } as const;

function Delta({ now, before, unit, goodWhenUp }: { now: number | null; before: number | null; unit: "pts" | "count" | "ms"; goodWhenUp: boolean }) {
  if (now === null || before === null || before === 0 && unit !== "count") return <span className="qd-delta">No earlier data</span>;
  const change = unit === "pts" ? Math.round((now - before) * 100) : now - before;
  if (change === 0) return <span className="qd-delta">Same as the period before</span>;
  const up = change > 0;
  const good = up === goodWhenUp;
  const text = unit === "pts" ? `${Math.abs(change)} pts` : unit === "ms" ? formatMs(Math.abs(change)) : Math.abs(change);
  return (
    <span className={`qd-delta ${good ? "is-good" : "is-bad"}`}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {text} vs the period before
    </span>
  );
}

export default function DashboardPage() {
  const { confirm } = useConfirm();
  const [range, setRange] = useState<Range>("24h");
  const [runs, setRuns] = useState<Run[]>([]);
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [apiDown, setApiDown] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefState, setBriefState] = useState({ loading: false, error: "" });
  const [suites, setSuites] = useState<Record<string, Suite>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [bucketFilter, setBucketFilter] = useState<Bucket | null>(null);
  const [sandboxes, setSandboxes] = useState<Sandbox[] | null>(null);
  const [platformApps, setPlatformApps] = useState<PlatformApp[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const failuresRef = useRef<HTMLElement>(null);
  const lastBriefKey = useRef("");

  const load = useCallback(async () => {
    try {
      const [r, p, t] = await Promise.all([api("/api/acceptance/runs"), api("/api/acceptance/plans"), api("/api/acceptance/targets")]);
      setRuns(r);
      setPlans(p);
      setTargets(t);
      setApiDown(false);
    } catch {
      setApiDown(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  const writeBrief = useCallback(async (refresh = false) => {
    setBriefState({ loading: true, error: "" });
    try {
      setBrief(await api(`/api/acceptance/brief${refresh ? "?refresh=true" : ""}`, { method: "POST" }));
      setBriefState({ loading: false, error: "" });
    } catch (e) {
      setBriefState({ loading: false, error: e instanceof Error ? e.message : "The brief could not be written." });
    }
  }, []);

  useEffect(() => {
    load();
    // The sandbox platform needs Docker; its absence should not affect the rest of the page.
    api("/api/sandboxes").then(setSandboxes).catch(() => setSandboxes(null));
    api("/api/apps").then(setPlatformApps).catch(() => setPlatformApps([]));
  }, [load]);

  const running = Object.values(suites).some(suite => !suite.finished) || runs.some(run => run.status === "queued" || run.status === "running");

  // Refresh quickly while something is running, slowly otherwise.
  useEffect(() => {
    const timer = setInterval(load, running ? 1500 : 10000);
    return () => clearInterval(timer);
  }, [load, running]);

  // Track suites started from this page.
  useEffect(() => {
    const active = Object.values(suites).filter(suite => !suite.finished);
    if (!active.length) return;
    const timer = setInterval(() => {
      active.forEach(suite => api(`/api/acceptance/suites/${suite.id}`)
        .then((next: Suite) => setSuites(current => ({ ...current, [next.id]: { ...current[next.id], ...next } })))
        .catch(() => {}));
    }, 1000);
    return () => clearInterval(timer);
  }, [suites]);

  // Write the brief once there are results, and again when a batch of runs finishes.
  const finishedCount = runs.filter(run => run.status !== "queued" && run.status !== "running").length;
  useEffect(() => {
    if (!finishedCount || running) return;
    const key = `${runs[0]?.id}:${finishedCount}`;
    if (key === lastBriefKey.current) return;
    lastBriefKey.current = key;
    writeBrief();
  }, [finishedCount, running, runs, writeBrief]);

  const stats = useMemo(() => summarize(runs, range), [runs, range]);
  const series = useMemo(() => buckets(runs, range), [runs, range]);
  const failures = useMemo(() => openFailures(runs, plans, targets), [runs, plans, targets]);
  const health = useMemo(() => appHealth(runs, targets, failures), [runs, targets, failures]);
  const planName = (id: string) => plans.find(plan => plan.id === id)?.name ?? "Untitled test";
  const targetFor = (url: string) => targets.find(t => t.url === url);
  const suiteFor = (targetId: string) => Object.values(suites).find(suite => suite.target_id === targetId && !suite.finished);
  const demoSuite = Object.values(suites).find(suite => suite.label === "Demo data");

  const activity = runs
    .filter(run => filter === "all" || (filter === "passed" ? run.status === "passed" : run.status === "failed" || run.status === "errored"))
    .filter(run => {
      if (!bucketFilter) return true;
      const size = (RANGES.find(r => r.id === range)!.hours / series.length) * 3_600_000;
      const at = new Date(run.created_at).getTime();
      return at >= bucketFilter.start && at < bucketFilter.start + size;
    })
    .slice(0, 12);

  async function startSuite(targetId: string) {
    try {
      const suite: Suite = await api("/api/acceptance/suites", { method: "POST", body: JSON.stringify({ target_id: targetId }) });
      setSuites(current => ({ ...current, [suite.id]: { ...suite, target_id: targetId } }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not start the suite.");
    }
  }

  async function seedDemo() {
    const suite: Suite = await api("/api/acceptance/demo", { method: "POST" });
    setSuites(current => ({ ...current, [suite.id]: suite }));
    load();
  }

  async function destroySandbox(containerId: string) {
    const ok = await confirm({
      title: "Destroy sandbox",
      description: "This sandbox will be permanently removed. This action cannot be undone.",
      confirmText: "Destroy",
      variant: "destructive",
    });
    if (!ok) return;
    await api(`/api/sandboxes/${containerId}`, { method: "DELETE" });
    setSandboxes(current => (current ?? []).filter(s => s.container_id !== containerId));
  }

  if (!loaded) {
    return (
      <div className="qd">
        <div className="qd-skeleton" style={{ height: 32, width: 220 }} />
        <div className="qd-kpis">{[0, 1, 2, 3].map(i => <div key={i} className="qd-card qd-skeleton" style={{ height: 118 }} />)}</div>
        <div className="qd-skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  const empty = !apiDown && finishedCount === 0;
  const passPct = stats.passRate === null ? null : Math.round(stats.passRate * 100);

  return (
    <div className="qd">
      <header className="qd-top">
        <div>
          <h1>Dashboard</h1>
          <p className="qd-sub">How your acceptance tests are doing, written from real runs.</p>
        </div>
        <div className="qd-top-actions">
          <div className="qd-segmented" role="radiogroup" aria-label="Time range">
            {RANGES.map(r => (
              <button key={r.id} type="button" role="radio" aria-checked={range === r.id} onClick={() => { setRange(r.id); setBucketFilter(null); }}>
                {r.label}
              </button>
            ))}
          </div>
          <Link href="/studio" className="qd-button is-primary"><Mic size={15} /> New test by voice</Link>
        </div>
      </header>

      {apiDown && (
        <div className="qd-banner" role="alert">
          The Q Labs API is not answering on port 8000. Start it with <code>./dev.ps1</code>, then this page fills in by itself.
        </div>
      )}

      {empty && (
        <section className="qd-card qd-welcome">
          <div>
            <h2>No test results yet</h2>
            <p>
              Load the demo data to see the dashboard working: four real tests run in Chromium against the broken and the
              fixed build of the demo store. Or create your own test by voice in the studio.
            </p>
          </div>
          <div className="qd-welcome-actions">
            {demoSuite && !demoSuite.finished ? (
              <div className="qd-progress-block">
                <span>Running demo tests, {demoSuite.done} of {demoSuite.total}</span>
                <span className="qd-progress"><span style={{ width: `${(demoSuite.done / demoSuite.total) * 100}%` }} /></span>
              </div>
            ) : (
              <button type="button" className="qd-button is-primary" onClick={seedDemo}><Database size={15} /> Load demo data</button>
            )}
            <Link href="/studio" className="qd-button"><Mic size={15} /> Open the studio</Link>
          </div>
        </section>
      )}

      <section className="qd-kpis" aria-label="Key numbers">
        <div className="qd-card qd-kpi is-hero">
          <span className="qd-label">Pass rate</span>
          <span className="qd-value">
            {passPct === null ? "None yet" : `${passPct}%`}
          </span>
          {passPct !== null && <span className="qd-meter" aria-hidden="true"><span style={{ width: `${passPct}%` }} /></span>}
          <Delta now={stats.passRate} before={stats.previousPassRate} unit="pts" goodWhenUp />
        </div>
        <div className="qd-card qd-kpi">
          <span className="qd-label">Runs</span>
          <span className="qd-value">{stats.runs}</span>
          <Delta now={stats.runs} before={stats.previousRuns} unit="count" goodWhenUp />
        </div>
        <button
          type="button"
          className={`qd-card qd-kpi is-link ${failures.length ? "is-alert" : ""}`}
          onClick={() => failuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          <span className="qd-label">Open failures</span>
          <span className="qd-value">{failures.length}</span>
          <span className="qd-delta">{failures.length ? "Tests whose latest run failed. Click to see them." : "Every test passed on its latest run."}</span>
        </button>
        <div className="qd-card qd-kpi">
          <span className="qd-label">Median run time</span>
          <span className="qd-value">{formatMs(stats.medianMs)}</span>
          <Delta now={stats.medianMs} before={stats.previousMedianMs} unit="ms" goodWhenUp={false} />
        </div>
      </section>

      <div className="qd-grid">
        <div className="qd-col">
          <section className="qd-card" aria-labelledby="chart-heading">
            <header className="qd-card-head">
              <div>
                <h2 id="chart-heading">Runs over time</h2>
                <p className="qd-sub">Each column is one {range === "24h" ? "hour" : "day"}. Click a column to list its runs.</p>
              </div>
            </header>
            <RunsChart data={series} onSelect={bucket => { setBucketFilter(bucket); setFilter("all"); }} />
          </section>
          <section className="qd-card" aria-labelledby="apps-heading">
            <header className="qd-card-head">
              <div>
                <h2 id="apps-heading">Apps</h2>
                <p className="qd-sub">Run every saved test against one app with one click.</p>
              </div>
              <Link href="/studio" className="qd-text-button">Add an app</Link>
            </header>
            <ul className="qd-apps">
              {health.map(app => {
                const suite = suiteFor(app.target.id);
                const pct = app.passRate === null ? null : Math.round(app.passRate * 100);
                return (
                  <li key={app.target.id}>
                    <div className="qd-app-main">
                      <strong>{app.target.name}</strong>
                      <span className="qd-sub">
                        {app.runs ? `${app.runs} runs, last ${timeAgo(app.last!.created_at)}` : "No runs yet"}
                        {app.open > 0 && <> <span aria-hidden="true">·</span> <b className="qd-text-bad">{app.open} failing</b></>}
                      </span>
                      {suite ? (
                        <span className="qd-progress-block">
                          <span>Running {suite.done} of {suite.total}</span>
                          <span className="qd-progress"><span style={{ width: `${(suite.done / Math.max(1, suite.total)) * 100}%` }} /></span>
                        </span>
                      ) : (
                        pct !== null && (
                          <span className="qd-app-meter">
                            <span className="qd-meter is-small"><span className={pct >= 80 ? "is-good" : pct >= 50 ? "is-warn" : "is-bad"} style={{ width: `${pct}%` }} /></span>
                            <b>{pct}%</b>
                          </span>
                        )
                      )}
                    </div>
                    <button type="button" className="qd-button is-small" onClick={() => startSuite(app.target.id)} disabled={!!suite || !plans.length}>
                      {suite ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} />} Run all tests
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
        <AiBrief brief={brief} loading={briefState.loading} error={briefState.error} onRefresh={() => writeBrief(true)} />
      </div>

      <section className="qd-card" aria-labelledby="failures-heading" ref={failuresRef}>
        <header className="qd-card-head">
          <div>
            <h2 id="failures-heading">Open failures</h2>
            <p className="qd-sub">What the test expected next to what the page actually showed.</p>
          </div>
          <span className={`qd-pill ${failures.length ? "is-bad" : "is-good"}`}>{failures.length ? `${failures.length} open` : "All clear"}</span>
        </header>
        {failures.length === 0 ? (
          <p className="qd-empty-line">{finishedCount ? "Nothing is failing right now." : "Failures show up here after your first runs."}</p>
        ) : (
          <ul className="qd-failures">
            {failures.map(failure => {
              const step = failure.plan.body.steps[failure.result.index];
              const open = expanded === failure.key;
              const studio = `/studio?plan=${failure.plan.id}${failure.target ? `&target=${failure.target.id}` : ""}`;
              return (
                <li key={failure.key} className={open ? "is-open" : undefined}>
                  <button type="button" className="qd-failure-row" onClick={() => setExpanded(open ? null : failure.key)} aria-expanded={open}>
                    <span className={`qd-status-icon is-${failure.run.status}`}>
                      {failure.run.status === "errored" ? <TriangleAlert size={15} /> : <XCircle size={15} />}
                    </span>
                    <span className="qd-failure-main">
                      <strong>{failure.plan.name}</strong>
                      <span className="qd-sub">
                        {failure.target?.name ?? failure.run.target} <span aria-hidden="true">·</span> step {failure.result.index + 1},{" "}
                        {ACTION_LABELS[step?.action as Action]?.toLowerCase() ?? step?.action} <span aria-hidden="true">·</span> failing since {timeAgo(failure.since)}
                      </span>
                      {failure.result.expected !== undefined ? (
                        <span className="qd-compare">
                          <span className="qd-chip is-expected"><em>Expected</em>{failure.result.expected}</span>
                          <span className="qd-chip is-actual"><em>Actual</em>{formatActual(failure.result.actual)}</span>
                        </span>
                      ) : (
                        <span className="qd-reason">{failure.result.reason}</span>
                      )}
                    </span>
                    <ChevronDown size={16} className="qd-chevron" />
                  </button>
                  {open && (
                    <div className="qd-failure-detail">
                      {failure.result.screenshot && (
                        <Image
                          unoptimized width={1280} height={800}
                          src={`${API_URL}/api/acceptance/runs/${failure.run.id}/screenshots/${failure.result.screenshot}`}
                          alt={`Screenshot of step ${failure.result.index + 1} in ${failure.plan.name}`}
                        />
                      )}
                      <div className="qd-detail-actions">
                        {failure.result.reason && <p className="qd-sub">{failure.result.reason}</p>}
                        <Link href={studio} className="qd-button">Open in studio <ArrowRight size={14} /></Link>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="qd-card" aria-labelledby="activity-heading">
        <header className="qd-card-head">
          <div>
            <h2 id="activity-heading">Recent activity</h2>
            <p className="qd-sub">
              {bucketFilter ? <>Runs from {bucketFilter.label}. <button type="button" className="qd-text-button" onClick={() => setBucketFilter(null)}>Show all</button></> : "The latest runs across every app."}
            </p>
          </div>
          <div className="qd-segmented is-small" role="radiogroup" aria-label="Filter runs">
            {(["all", "passed", "failed"] as Filter[]).map(f => (
              <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "passed" ? "Passed" : "Failed"}
              </button>
            ))}
          </div>
        </header>
        {activity.length === 0 ? (
          <p className="qd-empty-line">No runs match.</p>
        ) : (
          <table className="qd-table is-activity">
            <thead><tr><th>Result</th><th>Test</th><th>App</th><th>Time taken</th><th>When</th></tr></thead>
            <tbody>
              {activity.map(run => {
                const Icon = STATUS_ICON[run.status as keyof typeof STATUS_ICON] ?? Loader2;
                const target = targetFor(run.target);
                return (
                  <tr key={run.id}>
                    <td><span className={`qd-status is-${run.status}`}><Icon size={14} className={run.status === "running" || run.status === "queued" ? "animate-spin" : undefined} />{run.status === "errored" ? "Could not finish" : run.status}</span></td>
                    <td><Link href={`/studio?plan=${run.plan_id}${target ? `&target=${target.id}` : ""}`} className="qd-link">{planName(run.plan_id)}</Link></td>
                    <td className="qd-muted-cell">{target?.name ?? run.target}</td>
                    <td className="qd-num">{runDuration(run) ? formatMs(runDuration(run)) : ""}</td>
                    <td className="qd-muted-cell">{timeAgo(run.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="qd-card" aria-labelledby="sandbox-heading">
        <header className="qd-card-head">
          <div>
            <h2 id="sandbox-heading">Sandboxes</h2>
            <p className="qd-sub">Docker staging environments from the sandbox platform.</p>
          </div>
          <Link href="/apps" className="qd-text-button">Manage apps</Link>
        </header>
        {sandboxes === null ? (
          <p className="qd-empty-line"><Monitor size={15} /> Docker is not reachable, so sandboxes are paused. The test studio does not need Docker.</p>
        ) : sandboxes.length === 0 ? (
          <p className="qd-empty-line">
            <Box size={15} /> No sandboxes running. {platformApps.length ? `${platformApps.length} ${platformApps.length === 1 ? "app is" : "apps are"} ready to launch.` : "Upload a Docker image in Apps to start one."}
          </p>
        ) : (
          <table className="qd-table">
            <thead><tr><th>Name</th><th>Status</th><th>Port</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {sandboxes.map(sb => (
                <tr key={sb.container_id}>
                  <td><Link href={`/sandbox/${sb.container_id}`} className="qd-link">{sb.name || `Sandbox :${sb.port}`}</Link></td>
                  <td><span className="qd-status is-passed"><CheckCircle2 size={14} />{sb.status}</span></td>
                  <td className="qd-num">:{sb.port}</td>
                  <td className="qd-actions-cell">
                    {sb.shareable_url && (
                      <button type="button" className="qd-text-button" onClick={() => { navigator.clipboard.writeText(sb.shareable_url!); setCopied(sb.container_id); setTimeout(() => setCopied(null), 2000); }}>
                        <Share2 size={13} /> {copied === sb.container_id ? "Copied" : "Copy link"}
                      </button>
                    )}
                    <button type="button" className="qd-icon-button is-danger" onClick={() => destroySandbox(sb.container_id)} aria-label="Destroy sandbox">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
