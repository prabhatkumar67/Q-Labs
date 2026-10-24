"use client";

import { formatTime, targetLabel, type Run, type SavedPlan, type Target } from "./types";

type Props = {
  runs: Run[];
  plans: SavedPlan[];
  targets: Target[];
  currentRunId?: string;
  onOpen: (run: Run) => void;
};

export function RunHistory({ runs, plans, targets, currentRunId, onOpen }: Props) {
  return (
    <section className="qs-panel" aria-labelledby="history-heading">
      <header className="qs-panel-head">
        <h2 id="history-heading">History</h2>
        {runs.length > 0 && <span className="qs-count">{runs.length} {runs.length === 1 ? "run" : "runs"}</span>}
      </header>
      {runs.length === 0 ? (
        <p className="qs-empty-line">Runs you start appear here, newest first.</p>
      ) : (
        <ul className="qs-history">
          {runs.slice(0, 8).map(run => (
            <li key={run.id}>
              <button type="button" aria-current={run.id === currentRunId} onClick={() => onOpen(run)}>
                <span className={`qs-dot is-${run.status}`} aria-hidden="true" />
                <span className="qs-history-name">{plans.find(p => p.id === run.plan_id)?.name ?? "Untitled test"}</span>
                <span className="qs-history-target">{targetLabel(run.target, targets)}</span>
                <span className="qs-history-time">{formatTime(run.created_at)}</span>
                <span className={`qs-history-state is-${run.status}`}>{run.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
