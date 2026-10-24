"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Mic, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import { timeAgo } from "./metrics";

export type Brief = {
  headline: string;
  findings: { severity: "critical" | "warning" | "good"; title: string; detail: string }[];
  suggestions: string[];
  runs_considered: number;
  generated_at: number;
};

const SEVERITY = {
  critical: { Icon: XCircle, label: "Broken" },
  warning: { Icon: TriangleAlert, label: "Watch" },
  good: { Icon: CheckCircle2, label: "Fixed" },
} as const;

type Props = { brief: Brief | null; loading: boolean; error: string; onRefresh: () => void };

export function AiBrief({ brief, loading, error, onRefresh }: Props) {
  return (
    <section className="qd-card qd-brief" aria-labelledby="brief-heading">
      <header className="qd-card-head">
        <div>
          <h2 id="brief-heading">AI brief</h2>
          <p className="qd-sub">
            {brief ? `Written by Groq from your last ${brief.runs_considered} runs, ${timeAgo(brief.generated_at * 1000)}` : "Written by Groq from your real results"}
          </p>
        </div>
        <button type="button" className="qd-icon-button" onClick={onRefresh} disabled={loading} aria-label="Write the brief again">
          <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
        </button>
      </header>

      {loading && !brief && (
        <div className="qd-brief-loading" aria-live="polite">
          <span className="qd-skeleton" style={{ width: "85%" }} />
          <span className="qd-skeleton" style={{ width: "70%" }} />
          <span className="qd-skeleton" style={{ width: "78%" }} />
        </div>
      )}
      {error && !brief && <p className="qd-empty-line">{error}</p>}

      {brief && (
        <div className={loading ? "qd-brief-body is-stale" : "qd-brief-body"}>
          <p className="qd-headline">{brief.headline}</p>
          <ul className="qd-findings">
            {brief.findings.map(finding => {
              const { Icon, label } = SEVERITY[finding.severity];
              return (
                <li key={finding.title} className={`is-${finding.severity}`}>
                  <span className="qd-sev"><Icon size={14} aria-hidden="true" />{label}</span>
                  <div>
                    <strong>{finding.title}</strong>
                    <p>{finding.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {brief.suggestions.length > 0 && (
            <div className="qd-suggest">
              <p className="qd-label">Tests worth adding</p>
              {brief.suggestions.map(suggestion => (
                <Link key={suggestion} href={`/studio?say=${encodeURIComponent(suggestion)}`} className="qd-suggestion">
                  <Mic size={13} aria-hidden="true" />
                  <span>&ldquo;{suggestion}&rdquo;</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
