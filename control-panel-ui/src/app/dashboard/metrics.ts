import type { Result, Run, SavedPlan, Target } from "../studio/types";

export type Range = "24h" | "7d" | "30d";

export const RANGES: { id: Range; label: string; hours: number; buckets: number }[] = [
  { id: "24h", label: "24 hours", hours: 24, buckets: 24 },
  { id: "7d", label: "7 days", hours: 24 * 7, buckets: 7 },
  { id: "30d", label: "30 days", hours: 24 * 30, buckets: 30 },
];

export type Bucket = { start: number; label: string; passed: number; failed: number; errored: number };

export type OpenFailure = {
  key: string;
  run: Run;
  plan: SavedPlan;
  target: Target | undefined;
  result: Result;
  since: number;
};

const finished = (run: Run) => run.status !== "queued" && run.status !== "running";
const time = (run: Run) => new Date(run.created_at).getTime();

export function runDuration(run: Run) {
  return run.results.reduce((total, result) => total + (result.ms ?? 0), 0);
}

function inWindow(runs: Run[], hours: number, offset = 0) {
  const end = Date.now() - offset * hours * 3_600_000;
  const start = end - hours * 3_600_000;
  return runs.filter(run => finished(run) && time(run) > start && time(run) <= end);
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function passRate(runs: Run[]) {
  const counted = runs.filter(run => run.status !== "cancelled");
  return counted.length ? counted.filter(run => run.status === "passed").length / counted.length : null;
}

export function summarize(runs: Run[], range: Range) {
  const { hours } = RANGES.find(r => r.id === range)!;
  const current = inWindow(runs, hours);
  const previous = inWindow(runs, hours, 1);
  return {
    runs: current.length,
    previousRuns: previous.length,
    passRate: passRate(current),
    previousPassRate: passRate(previous),
    medianMs: median(current.map(runDuration).filter(ms => ms > 0)),
    previousMedianMs: median(previous.map(runDuration).filter(ms => ms > 0)),
  };
}

export function buckets(runs: Run[], range: Range): Bucket[] {
  const { hours, buckets: count } = RANGES.find(r => r.id === range)!;
  const size = (hours / count) * 3_600_000;
  const now = new Date();
  // Align the last bucket to the current hour (24h) or day (7d, 30d) so labels read naturally.
  const end = range === "24h"
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1).getTime()
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const list: Bucket[] = Array.from({ length: count }, (_, i) => {
    const start = end - (count - i) * size;
    const date = new Date(start);
    const label = range === "24h"
      ? date.toLocaleTimeString([], { hour: "numeric" })
      : date.toLocaleDateString([], range === "7d" ? { weekday: "short", day: "numeric" } : { month: "short", day: "numeric" });
    return { start, label, passed: 0, failed: 0, errored: 0 };
  });
  for (const run of runs) {
    if (!finished(run) || run.status === "cancelled") continue;
    const index = Math.floor((time(run) - (end - count * size)) / size);
    if (index < 0 || index >= count) continue;
    const bucket = list[index];
    if (run.status === "passed") bucket.passed++;
    else if (run.status === "failed") bucket.failed++;
    else bucket.errored++;
  }
  return list;
}

/** Tests whose latest run on an app failed or errored. Fixed problems drop off on their own. */
export function openFailures(runs: Run[], plans: SavedPlan[], targets: Target[]): OpenFailure[] {
  const byId = new Map(plans.map(plan => [plan.id, plan]));
  const seen = new Set<string>();
  const open: OpenFailure[] = [];
  for (const run of runs) {
    if (!finished(run) || run.status === "cancelled") continue;
    const plan = byId.get(run.plan_id);
    if (!plan) continue;
    const key = `${JSON.stringify(plan.body)}|${run.target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (run.status !== "failed" && run.status !== "errored") continue;
    const result = run.results.find(r => r.status === "failed" || r.status === "errored");
    if (!result) continue;
    // How long it has been broken: walk back through earlier runs of the same test on the same app.
    let since = time(run);
    for (const older of runs) {
      if (time(older) >= since || JSON.stringify(byId.get(older.plan_id)?.body) !== JSON.stringify(plan.body) || older.target !== run.target) continue;
      if (older.status === "passed") break;
      since = time(older);
    }
    open.push({ key, run, plan, target: targets.find(t => t.url === run.target), result, since });
  }
  return open;
}

export type AppHealth = { target: Target; runs: number; passRate: number | null; last: Run | undefined; open: number };

export function appHealth(runs: Run[], targets: Target[], failures: OpenFailure[]): AppHealth[] {
  return targets.map(target => {
    const mine = runs.filter(run => run.target === target.url && finished(run));
    return {
      target,
      runs: mine.length,
      passRate: passRate(mine),
      last: mine[0],
      open: failures.filter(failure => failure.run.target === target.url).length,
    };
  });
}

export function formatMs(ms: number | null) {
  if (ms === null) return "None yet";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function timeAgo(value: number | string) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}
