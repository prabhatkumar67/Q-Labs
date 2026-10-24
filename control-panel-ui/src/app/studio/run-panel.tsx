"use client";

import Image from "next/image";
import { CheckCircle2, CircleDashed, CircleSlash, Loader2, XCircle } from "lucide-react";
import { ACTION_LABELS, API_URL, formatActual, formatTime, isActive, targetLabel, type Action, type Result, type Run, type Target } from "./types";

type Props = {
  run: Run | null;
  targets: Target[];
  selectedStep: number | null;
  onSelectStep: (index: number) => void;
  onCancel: () => void;
  cancelling: boolean;
};

const STATUS_TITLE: Record<string, string> = {
  passed: "Passed",
  failed: "Failed",
  errored: "Could not finish",
  queued: "Queued",
  running: "Running",
  cancelled: "Cancelled",
};

function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  if (status === "passed") return <CheckCircle2 size={size} />;
  if (status === "failed" || status === "errored") return <XCircle size={size} />;
  if (status === "queued" || status === "running") return <Loader2 size={size} className="animate-spin" />;
  if (status === "blocked") return <CircleSlash size={size} />;
  return <CircleDashed size={size} />;
}

function summary(run: Run): string {
  const checks = run.results.filter(r => r.action.startsWith("assert_"));
  const failed = checks.filter(r => r.status === "failed").length;
  if (run.status === "passed") return checks.length === 1 ? "The check matched." : `All ${checks.length} checks matched.`;
  if (run.status === "failed") return `${failed} of ${checks.length} ${checks.length === 1 ? "check" : "checks"} did not match.`;
  if (run.status === "errored") return "The browser could not complete a step, so this is not a pass or a fail.";
  if (run.status === "cancelled") return "Stopped before every step ran.";
  return `${run.results.length} ${run.results.length === 1 ? "step" : "steps"} done so far.`;
}

function ResultRow({ result, selected, onSelect }: { result: Result; selected: boolean; onSelect: () => void }) {
  const mismatch = result.status === "failed" && result.expected !== undefined;
  return (
    <li>
      <button type="button" className={`qs-result is-${result.status}`} aria-pressed={selected} onClick={onSelect}>
        <span className="qs-result-icon"><StatusIcon status={result.status} /></span>
        <span className="qs-result-body">
          <span className="qs-result-title">
            {result.index + 1}. {ACTION_LABELS[result.action as Action] ?? result.action}
          </span>
          {result.expected !== undefined && (
            <span className="qs-compare">
              <span>Expected</span><code>{result.expected}</code>
              <span>Actual</span><code className={mismatch ? "is-wrong" : undefined}>{formatActual(result.actual)}</code>
            </span>
          )}
          {result.reason && <span className="qs-result-reason">{result.reason}</span>}
        </span>
        <span className="qs-result-state">{result.status}</span>
      </button>
    </li>
  );
}

/** What the browser actually did, step by step, with the screenshot it took. */
export function RunPanel({ run, targets, selectedStep, onSelectStep, onCancel, cancelling }: Props) {
  if (!run) {
    return (
      <section className="qs-panel qs-result-panel" aria-labelledby="result-heading">
        <header className="qs-panel-head"><h2 id="result-heading">Result</h2></header>
        <p className="qs-empty-block">
          No run yet. Run the test to see what each step did, the text the page actually showed and a screenshot.
        </p>
      </section>
    );
  }

  const withShots = run.results.filter(r => r.screenshot);
  const shot =
    withShots.find(r => r.index === selectedStep) ??
    withShots.find(r => r.status === "failed") ??
    withShots[withShots.length - 1];

  return (
    <section className="qs-panel qs-result-panel" aria-labelledby="result-heading">
      <header className="qs-panel-head"><h2 id="result-heading">Result</h2></header>

      <div className={`qs-status is-${run.status}`} role="status">
        <StatusIcon status={run.status} size={18} />
        <div>
          <strong>{STATUS_TITLE[run.status] ?? run.status}</strong>
          <span>{summary(run)}</span>
        </div>
        {isActive(run) && (
          <button type="button" className="qs-link-button" disabled={cancelling} onClick={onCancel}>Cancel</button>
        )}
      </div>
      <p className="qs-run-meta">{targetLabel(run.target, targets)} <span aria-hidden="true">·</span> {formatTime(run.created_at)}</p>
      {run.reason && <p className="qs-run-reason">{run.reason}</p>}

      <ol className="qs-results">
        {run.results.map(result => (
          <ResultRow
            key={result.index}
            result={result}
            selected={shot?.index === result.index}
            onSelect={() => onSelectStep(result.index)}
          />
        ))}
      </ol>

      {shot?.screenshot && (
        <figure className="qs-shot">
          <figcaption>
            <span>Screenshot after step {shot.index + 1}</span>
            {withShots.length > 1 && (
              <span className="qs-shot-tabs" role="group" aria-label="Choose screenshot">
                {withShots.map(r => (
                  <button
                    type="button"
                    key={r.index}
                    aria-pressed={r.index === shot.index}
                    onClick={() => onSelectStep(r.index)}
                  >
                    {r.index + 1}
                  </button>
                ))}
              </span>
            )}
          </figcaption>
          <Image
            unoptimized
            width={1280}
            height={800}
            src={`${API_URL}/api/acceptance/runs/${run.id}/screenshots/${shot.screenshot}`}
            alt={`Browser capture after step ${shot.index + 1}`}
          />
        </figure>
      )}
    </section>
  );
}
